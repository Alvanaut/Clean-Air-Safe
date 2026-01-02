import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Alert, AlertStatus, AlertSeverity } from './alert.entity';
import { AlertRule, NotificationChannel } from './alert-rule.entity';
import { Sensor } from '../sensors/sensor.entity';
import { User, UserRole } from '../../users/user.entity';
import { UsersService } from '../../users/users.service';
import { NotificationService } from './notification.service';
import { SyncGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private alertRepository: Repository<Alert>,
    @InjectRepository(AlertRule)
    private alertRuleRepository: Repository<AlertRule>,
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
    @InjectQueue('alerts')
    private alertQueue: Queue,
    private usersService: UsersService,
    private notificationService: NotificationService,
    private websocketGateway: SyncGateway,
  ) {}

  /**
   * Check CO2 level and trigger alert if threshold exceeded
   * Called from KspSyncService after saving sensor reading
   */
  async checkAndTriggerAlert(
    sensorId: string,
    co2Level: number,
    tenantId: string,
  ): Promise<Alert | null> {
    try {
      // 1. Find applicable rules (sensor > space > tenant, ordered by priority)
      const rules = await this.findApplicableRules(sensorId, tenantId);
      const rule = this.findMatchingRule(rules, co2Level);

      if (!rule) {
        this.logger.debug(
          `No alert rule matched for sensor ${sensorId} with CO2 ${co2Level} ppm`,
        );
        return null;
      }

      // 2. Check if an active alert already exists for this sensor
      const existingAlert = await this.findActiveAlert(sensorId);

      if (existingAlert) {
        // Update existing alert if CO2 level has increased
        if (co2Level > existingAlert.co2_level) {
          this.logger.log(
            `Updating existing alert ${existingAlert.id} - CO2 increased to ${co2Level} ppm`,
          );
          existingAlert.co2_level = co2Level;
          existingAlert.severity =
            co2Level > rule.threshold_co2 + 200
              ? AlertSeverity.CRITICAL
              : AlertSeverity.WARNING;
          await this.alertRepository.save(existingAlert);
        }
        return existingAlert;
      }

      // 3. Create new alert
      const sensor = await this.sensorRepository.findOne({
        where: { id: sensorId },
        relations: ['responsible_user', 'space', 'space.responsible_user'],
      });

      if (!sensor) {
        this.logger.error(`Sensor ${sensorId} not found`);
        return null;
      }

      this.logger.warn(
        `🚨 Triggering new alert for sensor ${sensor.name} - CO2: ${co2Level} ppm (threshold: ${rule.threshold_co2} ppm)`,
      );

      const alert = new Alert();
      alert.sensor_id = sensorId;
      alert.sensor = sensor;
      alert.tenant_id = tenantId;
      alert.co2_level = co2Level;
      alert.threshold_exceeded = rule.threshold_co2;
      alert.severity =
        co2Level > rule.threshold_co2 + 200
          ? AlertSeverity.CRITICAL
          : AlertSeverity.WARNING;
      alert.status = AlertStatus.ACTIVE;
      alert.escalation_level = 0;
      alert.notified_users = [];

      await this.alertRepository.save(alert);

      // 4. Send initial notification to responsible user
      const responsibleUser =
        sensor.responsible_user || sensor.space?.responsible_user;

      if (responsibleUser) {
        this.logger.log(
          `Notifying responsible user ${responsibleUser.email} for alert ${alert.id}`,
        );

        await this.notificationService.sendAlertNotification(
          alert,
          responsibleUser,
          rule.notification_channels,
        );

        alert.notified_users = [responsibleUser.id];
        await this.alertRepository.save(alert);
      } else {
        this.logger.warn(
          `No responsible user found for sensor ${sensor.name} - alert created but not notified`,
        );
      }

      // 5. Schedule escalation job
      await this.scheduleEscalation(alert, rule);

      // 6. Emit WebSocket event for real-time updates
      this.websocketGateway.emitAlertTriggered(alert);

      this.logger.log(
        `Alert ${alert.id} created and scheduled for escalation in ${rule.escalation_delay_minutes} minutes`,
      );

      return alert;
    } catch (error) {
      this.logger.error(
        `Error checking/triggering alert for sensor ${sensorId}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Escalate alert to the next level in hierarchy
   * Called by Bull Queue job after escalation delay
   *
   * IMPORTANT: Before escalating, we check current CO2 level:
   * - If CO2 is back below threshold → auto-resolve the alert
   * - If CO2 is still high → escalate to n+1
   */
  async escalateAlert(alertId: string): Promise<void> {
    try {
      const alert = await this.alertRepository.findOne({
        where: { id: alertId },
        relations: ['sensor', 'sensor.responsible_user', 'sensor.space'],
      });

      if (!alert) {
        this.logger.warn(`Alert ${alertId} not found for escalation`);
        return;
      }

      if (alert.status !== AlertStatus.ACTIVE) {
        this.logger.debug(
          `Alert ${alertId} is ${alert.status} - skipping escalation`,
        );
        return;
      }

      const rules = await this.findApplicableRules(
        alert.sensor_id,
        alert.tenant_id,
      );
      const rule = rules[0];

      if (!rule) {
        this.logger.error(`No rule found for alert ${alertId} escalation`);
        return;
      }

      // *** CHECK CURRENT CO2 LEVEL BEFORE ESCALATING ***
      const sensor = await this.sensorRepository.findOne({
        where: { id: alert.sensor_id },
        relations: ['space'],
      });

      if (sensor && sensor.last_reading_co2 !== null) {
        const currentCo2 = sensor.last_reading_co2;

        // If CO2 is back below threshold, auto-resolve instead of escalating
        if (currentCo2 <= rule.threshold_co2) {
          this.logger.log(
            `🟢 CO2 normalized (${currentCo2} ppm <= ${rule.threshold_co2} ppm) - Auto-resolving alert ${alertId}`,
          );
          await this.resolveAlert(
            alertId,
            `Auto-résolu: CO2 normalisé à ${currentCo2} ppm après ${rule.escalation_delay_minutes} min`,
          );
          return;
        }

        // Update alert with latest CO2 reading
        alert.co2_level = currentCo2;
        alert.severity =
          currentCo2 > rule.threshold_co2 + 200
            ? AlertSeverity.CRITICAL
            : AlertSeverity.WARNING;

        this.logger.log(
          `🔴 CO2 still elevated (${currentCo2} ppm > ${rule.threshold_co2} ppm) - Proceeding with escalation`,
        );
      }

      // Check if max escalation level reached
      if (alert.escalation_level >= rule.max_escalation_level) {
        this.logger.warn(
          `Alert ${alertId} reached max escalation level (${rule.max_escalation_level})`,
        );
        // Schedule another check after delay even at max level
        await this.scheduleEscalation(alert, rule);
        return;
      }

      // Find current user who was last notified
      const currentUserId =
        alert.notified_users[alert.notified_users.length - 1];

      if (!currentUserId) {
        this.logger.error(
          `No current user found for alert ${alertId} escalation`,
        );
        return;
      }

      // Get hierarchy chain to find parent
      const hierarchyChain = await this.usersService.getHierarchyChain(
        currentUserId,
      );

      if (hierarchyChain.length < 2) {
        this.logger.warn(
          `No parent user found in hierarchy for alert ${alertId} escalation`,
        );
        // Schedule another check even if no parent
        await this.scheduleEscalation(alert, rule);
        return;
      }

      const parentUser = hierarchyChain[1];

      this.logger.warn(
        `⚠️ Escalating alert ${alertId} from ${currentUserId} to ${parentUser.email} (level ${alert.escalation_level + 1})`,
      );

      // Update alert
      alert.escalation_level += 1;
      alert.last_escalation_at = new Date();
      alert.notified_users.push(parentUser.id);
      await this.alertRepository.save(alert);

      // Notify parent user
      await this.notificationService.sendAlertNotification(
        alert,
        parentUser,
        rule.notification_channels,
        {
          isEscalation: true,
          escalationLevel: alert.escalation_level,
        },
      );

      // Always schedule next check (to monitor CO2 evolution)
      await this.scheduleEscalation(alert, rule);

      // Emit WebSocket event
      this.websocketGateway.emitAlertEscalated(alert);

      this.logger.log(
        `Alert ${alertId} escalated to level ${alert.escalation_level}`,
      );
    } catch (error) {
      this.logger.error(`Error escalating alert ${alertId}`, error.stack);
    }
  }

  /**
   * Acknowledge an alert (stops escalation)
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string,
    currentUser: User,
  ): Promise<Alert> {
    const alert = await this.findOne(alertId, currentUser);

    if (alert.status !== AlertStatus.ACTIVE) {
      throw new BadRequestException(
        `Alert is ${alert.status} and cannot be acknowledged`,
      );
    }

    this.logger.log(`User ${currentUser.email} acknowledging alert ${alertId}`);

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledged_at = new Date();
    alert.acknowledged_by_user_id = userId;
    await this.alertRepository.save(alert);

    // Cancel escalation jobs
    await this.cancelEscalationJobs(alertId);

    // Emit WebSocket event
    this.websocketGateway.emitAlertAcknowledged(alert);

    this.logger.log(`Alert ${alertId} acknowledged by user ${userId}`);

    return alert;
  }

  /**
   * Resolve an alert (manual or automatic)
   */
  async resolveAlert(
    alertId: string,
    resolutionNote?: string,
  ): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
      relations: ['sensor'],
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    this.logger.log(
      `Resolving alert ${alertId}: ${resolutionNote || 'No note provided'}`,
    );

    alert.status = AlertStatus.RESOLVED;
    alert.resolved_at = new Date();
    alert.resolution_note = resolutionNote || 'CO2 level normalized';
    await this.alertRepository.save(alert);

    // Cancel escalation jobs
    await this.cancelEscalationJobs(alertId);

    // Emit WebSocket event
    this.websocketGateway.emitAlertResolved(alert);

    this.logger.log(`Alert ${alertId} resolved`);

    return alert;
  }

  /**
   * Check if alert should be auto-resolved (CO2 < baseline + 500)
   * Called from KspSyncService after saving sensor reading
   */
  async checkAndResolveAlert(
    sensorId: string,
    co2Level: number,
  ): Promise<void> {
    try {
      const activeAlert = await this.findActiveAlert(sensorId);

      if (!activeAlert) {
        return;
      }

      const sensor = await this.sensorRepository.findOne({
        where: { id: sensorId },
        relations: ['space'],
      });

      if (!sensor) {
        return;
      }

      const baseline = sensor.space?.co2_baseline || 400;
      const greenThreshold = baseline + 500;

      if (co2Level <= greenThreshold) {
        this.logger.log(
          `Auto-resolving alert ${activeAlert.id} - CO2 normalized to ${co2Level} ppm (green threshold: ${greenThreshold} ppm)`,
        );

        await this.resolveAlert(
          activeAlert.id,
          `Auto-résolu: CO2 normalisé à ${co2Level} ppm`,
        );

        // Notify all users who were notified about the alert
        const rules = await this.findApplicableRules(sensorId, sensor.tenant_id);
        const rule = rules[0];

        if (rule) {
          for (const userId of activeAlert.notified_users) {
            try {
              const user = await this.usersService.findOne(userId);
              await this.notificationService.sendAlertNotification(
                activeAlert,
                user,
                rule.notification_channels,
                { isResolution: true },
              );
            } catch (error) {
              this.logger.error(
                `Failed to notify user ${userId} about alert resolution`,
                error.stack,
              );
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error checking alert resolution for sensor ${sensorId}`,
        error.stack,
      );
    }
  }

  /**
   * Get all alerts (with tenant filtering)
   */
  async findAll(
    currentUser: User,
    filters?: {
      status?: AlertStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<Alert[]> {
    const queryBuilder = this.alertRepository
      .createQueryBuilder('alert')
      .leftJoinAndSelect('alert.sensor', 'sensor')
      .leftJoinAndSelect('sensor.space', 'space')
      .orderBy('alert.created_at', 'DESC');

    // Apply role-based filtering
    if (currentUser.role === UserRole.GODMODE) {
      // GODMODE sees all alerts
    } else if (
      currentUser.role === UserRole.COMPANY_ADMIN ||
      currentUser.role === UserRole.MANAGER
    ) {
      // Admins/Managers see alerts in their tenant
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }
      queryBuilder.where('alert.tenant_id = :tenantId', {
        tenantId: currentUser.tenant_id,
      });
    } else {
      // Regular users see only alerts for their assigned sensors
      queryBuilder.where('sensor.responsible_user_id = :userId', {
        userId: currentUser.id,
      });
    }

    // Apply status filter
    if (filters?.status) {
      queryBuilder.andWhere('alert.status = :status', {
        status: filters.status,
      });
    }

    // Apply pagination
    if (filters?.limit) {
      queryBuilder.take(filters.limit);
    }
    if (filters?.offset) {
      queryBuilder.skip(filters.offset);
    }

    return await queryBuilder.getMany();
  }

  /**
   * Get a single alert by ID (with permission check)
   */
  async findOne(id: string, currentUser: User): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id },
      relations: ['sensor', 'sensor.space', 'tenant'],
    });

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    // Check access permissions
    if (currentUser.role !== UserRole.GODMODE) {
      if (
        currentUser.role === UserRole.COMPANY_ADMIN ||
        currentUser.role === UserRole.MANAGER
      ) {
        if (alert.tenant_id !== currentUser.tenant_id) {
          throw new ForbiddenException('Access denied');
        }
      } else if (alert.sensor.responsible_user_id !== currentUser.id) {
        throw new ForbiddenException('Access denied');
      }
    }

    return alert;
  }

  /**
   * Get alert statistics for current user
   */
  async getStats(currentUser: User): Promise<{
    active_count: number;
    acknowledged_count: number;
    resolved_count: number;
    critical_count: number;
  }> {
    const queryBuilder = this.alertRepository.createQueryBuilder('alert');

    // Apply role-based filtering
    if (currentUser.role === UserRole.GODMODE) {
      // GODMODE sees all
    } else if (
      currentUser.role === UserRole.COMPANY_ADMIN ||
      currentUser.role === UserRole.MANAGER
    ) {
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }
      queryBuilder.where('alert.tenant_id = :tenantId', {
        tenantId: currentUser.tenant_id,
      });
    } else {
      queryBuilder
        .leftJoin('alert.sensor', 'sensor')
        .where('sensor.responsible_user_id = :userId', { userId: currentUser.id });
    }

    const alerts = await queryBuilder.getMany();

    return {
      active_count: alerts.filter((a) => a.status === AlertStatus.ACTIVE)
        .length,
      acknowledged_count: alerts.filter(
        (a) => a.status === AlertStatus.ACKNOWLEDGED,
      ).length,
      resolved_count: alerts.filter((a) => a.status === AlertStatus.RESOLVED)
        .length,
      critical_count: alerts.filter((a) => a.severity === AlertSeverity.CRITICAL)
        .length,
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Find applicable alert rules for a sensor (sensor > space > tenant)
   */
  private async findApplicableRules(
    sensorId: string,
    tenantId: string,
  ): Promise<AlertRule[]> {
    const sensor = await this.sensorRepository.findOne({
      where: { id: sensorId },
      relations: ['space'],
    });

    if (!sensor) {
      return [];
    }

    // Priority: sensor-specific > space-specific > tenant-default
    return await this.alertRuleRepository.find({
      where: [
        { sensor_id: sensorId, is_active: true },
        { space_id: sensor.space_id, is_active: true, sensor_id: IsNull() },
        {
          tenant_id: tenantId,
          is_active: true,
          space_id: IsNull(),
          sensor_id: IsNull(),
        },
      ],
      order: { priority: 'DESC' },
    });
  }

  /**
   * Find rule that matches current CO2 level
   */
  private findMatchingRule(
    rules: AlertRule[],
    co2Level: number,
  ): AlertRule | null {
    return rules.find((rule) => co2Level > rule.threshold_co2) || null;
  }

  /**
   * Find active alert for a sensor
   */
  private async findActiveAlert(sensorId: string): Promise<Alert | null> {
    return await this.alertRepository.findOne({
      where: {
        sensor_id: sensorId,
        status: AlertStatus.ACTIVE,
      },
      relations: ['sensor'],
    });
  }

  /**
   * Schedule escalation job in Bull Queue
   */
  private async scheduleEscalation(
    alert: Alert,
    rule: AlertRule,
  ): Promise<void> {
    const delayMs = rule.escalation_delay_minutes * 60 * 1000;
    const jobId = `escalate-${alert.id}-${alert.escalation_level}`;

    await this.alertQueue.add(
      'escalate',
      { alertId: alert.id },
      {
        delay: delayMs,
        jobId,
      },
    );

    this.logger.debug(
      `Escalation job ${jobId} scheduled in ${rule.escalation_delay_minutes} minutes`,
    );
  }

  /**
   * Cancel all escalation jobs for an alert
   */
  private async cancelEscalationJobs(alertId: string): Promise<void> {
    const jobs = await this.alertQueue.getJobs(['delayed', 'waiting']);

    for (const job of jobs) {
      if (job.data.alertId === alertId) {
        await job.remove();
        this.logger.debug(`Cancelled escalation job ${job.id} for alert ${alertId}`);
      }
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationLog, NotificationStatus } from './notification-log.entity';
import { NotificationChannel } from './alert-rule.entity';
import { Alert } from './alert.entity';
import { User } from '../../users/user.entity';
import { INotificationProvider } from './providers/notification-provider.interface';
import { EmailNotificationProvider } from './providers/email-notification.provider';
import { SmsNotificationProvider } from './providers/sms-notification.provider';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private providers: Map<NotificationChannel, INotificationProvider>;

  constructor(
    @InjectRepository(NotificationLog)
    private notificationLogRepository: Repository<NotificationLog>,
    private configService: ConfigService,
  ) {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Email provider
    this.providers.set(
      NotificationChannel.EMAIL,
      new EmailNotificationProvider(this.configService),
    );

    // Initialize SMS provider
    this.providers.set(
      NotificationChannel.SMS,
      new SmsNotificationProvider(this.configService),
    );

    this.logger.log(
      `Initialized ${this.providers.size} notification providers: ${Array.from(this.providers.keys()).join(', ')}`,
    );
  }

  /**
   * Send alert notification through multiple channels
   * @param alert - Alert to notify about
   * @param user - User to notify
   * @param channels - Notification channels to use (EMAIL, SMS)
   * @param metadata - Additional metadata (isEscalation, escalationLevel, isResolution)
   */
  async sendAlertNotification(
    alert: Alert,
    user: User,
    channels: NotificationChannel[],
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.logger.log(
      `Sending alert ${alert.id} notification to user ${user.email} via ${channels.join(', ')}`,
    );

    const results: Promise<void>[] = [];

    for (const channel of channels) {
      const provider = this.providers.get(channel);
      if (!provider) {
        this.logger.warn(`No provider found for channel: ${channel}`);
        continue;
      }

      // Create notification log entry
      const log = this.createNotificationLog(alert, user, channel);

      // Send notification and update log
      const promise = this.sendAndLogNotification(
        provider,
        alert,
        user,
        channel,
        log,
        metadata,
      );

      results.push(promise);
    }

    // Wait for all notifications to complete (parallel execution)
    await Promise.allSettled(results);
  }

  /**
   * Send notification and log the result
   */
  private async sendAndLogNotification(
    provider: INotificationProvider,
    alert: Alert,
    user: User,
    channel: NotificationChannel,
    log: NotificationLog,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await provider.sendAlertNotification(alert, user, metadata);
      log.status = NotificationStatus.SENT;
      log.metadata = { ...metadata, sent_at: new Date().toISOString() };

      this.logger.log(
        `Successfully sent ${channel} notification to ${user.email} for alert ${alert.id}`,
      );
    } catch (error) {
      log.status = NotificationStatus.FAILED;
      log.error_message = error.message;
      log.metadata = { ...metadata, error: error.stack };

      this.logger.error(
        `Failed to send ${channel} notification to ${user.email} for alert ${alert.id}`,
        error.stack,
      );
    } finally {
      await this.notificationLogRepository.save(log);
    }
  }

  /**
   * Create a notification log entry
   */
  private createNotificationLog(
    alert: Alert,
    user: User,
    channel: NotificationChannel,
  ): NotificationLog {
    const log = new NotificationLog();
    log.alert_id = alert.id;
    log.user_id = user.id;
    log.tenant_id = alert.tenant_id;
    log.channel = channel;
    log.status = NotificationStatus.PENDING;
    return log;
  }

  /**
   * Get notification logs for an alert
   */
  async getLogsForAlert(alertId: string): Promise<NotificationLog[]> {
    return await this.notificationLogRepository.find({
      where: { alert_id: alertId },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get notification logs for a user
   */
  async getLogsForUser(
    userId: string,
    limit: number = 50,
  ): Promise<NotificationLog[]> {
    return await this.notificationLogRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get notification stats for a tenant
   */
  async getStatsForTenant(tenantId: string): Promise<{
    total: number;
    sent: number;
    failed: number;
    byChannel: Record<string, { sent: number; failed: number }>;
  }> {
    const logs = await this.notificationLogRepository.find({
      where: { tenant_id: tenantId },
    });

    const stats = {
      total: logs.length,
      sent: logs.filter((l) => l.status === NotificationStatus.SENT).length,
      failed: logs.filter((l) => l.status === NotificationStatus.FAILED).length,
      byChannel: {} as Record<string, { sent: number; failed: number }>,
    };

    for (const channel of Object.values(NotificationChannel)) {
      const channelLogs = logs.filter((l) => l.channel === channel);
      stats.byChannel[channel] = {
        sent: channelLogs.filter((l) => l.status === NotificationStatus.SENT)
          .length,
        failed: channelLogs.filter((l) => l.status === NotificationStatus.FAILED)
          .length,
      };
    }

    return stats;
  }
}

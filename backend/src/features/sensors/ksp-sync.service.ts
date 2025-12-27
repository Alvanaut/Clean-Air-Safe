import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { KspService } from '../../core/integrations/ksp/ksp.service';
import {
  KspRealtimeLog,
  KspHistoricLog,
} from '../../core/integrations/ksp/ksp.types';
import { Sensor, SensorStatus } from './sensor.entity';
import { SensorReading } from '../readings/sensor-reading.entity';
import { Tenant, TenantStatus } from '../../tenants/tenant.entity';

@Injectable()
export class KspSyncService {
  private readonly logger = new Logger(KspSyncService.name);
  private readonly syncEnabled: boolean;
  private isSyncing = false;

  constructor(
    private readonly kspService: KspService,
    private readonly configService: ConfigService,
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
    @InjectRepository(SensorReading)
    private readonly readingRepository: Repository<SensorReading>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {
    this.syncEnabled =
      this.configService.get('SENSOR_POLLING_ENABLED') === 'true';
  }

  /**
   * Cron job - Runs every 10 minutes
   * Format: second minute hour day month dayOfWeek
   */
  @Cron('0 */10 * * * *')
  async handleCron() {
    if (!this.syncEnabled) {
      this.logger.debug('Sync disabled via config');
      return;
    }

    if (this.isSyncing) {
      this.logger.warn('Previous sync still in progress, skipping...');
      return;
    }

    try {
      this.isSyncing = true;
      await this.syncAllTenants();
    } catch (error) {
      this.logger.error('Cron sync failed', error.stack);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Manual trigger - Can be called via API endpoint for testing
   */
  async syncNow(): Promise<void> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    try {
      this.isSyncing = true;
      await this.syncAllTenants();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync all active tenants
   */
  private async syncAllTenants(): Promise<void> {
    this.logger.log('Starting KSP sync for all tenants...');

    const tenants = await this.tenantRepository.find({
      where: {
        status: TenantStatus.ACTIVE,
        sync_enabled: true,
      },
    });

    this.logger.log(`Found ${tenants.length} active tenants with sync enabled`);

    for (const tenant of tenants) {
      try {
        await this.syncTenant(tenant);
      } catch (error) {
        this.logger.error(
          `Failed to sync tenant ${tenant.name} (${tenant.id})`,
          error.stack,
        );
      }
    }

    this.logger.log('KSP sync completed for all tenants');
  }

  /**
   * Sync a single tenant
   */
  async syncTenant(tenant: Tenant): Promise<void> {
    if (!tenant.ksp_contract_id) {
      this.logger.warn(
        `Tenant ${tenant.name} has no KSP contract ID, skipping`,
      );
      return;
    }

    this.logger.log(`Syncing tenant: ${tenant.name} (${tenant.id})`);

    try {
      // Step 1: Fetch devices from KSP
      const devicesResponse = await this.kspService.getDevices(
        tenant.ksp_contract_id,
      );

      if (!devicesResponse.devices || devicesResponse.devices.length === 0) {
        this.logger.warn(`No devices found for tenant ${tenant.name}`);
        return;
      }

      this.logger.log(
        `Found ${devicesResponse.devices.length} devices for tenant ${tenant.name}`,
      );

      // Step 2: Sync each device
      for (const kspDevice of devicesResponse.devices) {
        try {
          await this.syncDevice(tenant, kspDevice);
        } catch (error) {
          this.logger.error(
            `Failed to sync device ${kspDevice.id} for tenant ${tenant.name}`,
            error.stack,
          );
        }
      }

      this.logger.log(`Completed sync for tenant: ${tenant.name}`);
    } catch (error) {
      this.logger.error(`Error syncing tenant ${tenant.name}`, error.stack);
      throw error;
    }
  }

  /**
   * Sync a single device (sensor)
   */
  private async syncDevice(tenant: Tenant, kspDevice: any): Promise<void> {
    const deviceId = kspDevice.id;

    // Check if sensor already exists
    let sensor = await this.sensorRepository.findOne({
      where: {
        ksp_device_id: deviceId,
        tenant_id: tenant.id,
      },
    });

    if (!sensor) {
      // Create new sensor
      this.logger.log(`Creating new sensor for KSP device ${deviceId}`);

      sensor = this.sensorRepository.create({
        name: kspDevice.name || `Sensor ${deviceId}`,
        description: kspDevice.details || null,
        ksp_device_id: deviceId,
        ksp_timezone: kspDevice.timezone || null,
        qr_code: uuidv4(),
        status: SensorStatus.ACTIVE,
        sync_status: SensorStatus.ACTIVE,
        tenant_id: tenant.id,
      });

      sensor = await this.sensorRepository.save(sensor);
      this.logger.log(`Created sensor ${sensor.id} for device ${deviceId}`);
    } else {
      // Update existing sensor metadata
      sensor.name = kspDevice.name || sensor.name;
      sensor.description = kspDevice.details || sensor.description;
      sensor.ksp_timezone = kspDevice.timezone || sensor.ksp_timezone;
      sensor.sync_status = SensorStatus.ACTIVE;
      sensor.sync_error = null;
    }

    // Fetch recent readings for this device
    try {
      await this.syncDeviceReadings(tenant, sensor);
      sensor.last_sync_at = new Date();
    } catch (error) {
      this.logger.error(
        `Failed to sync readings for device ${deviceId}`,
        error.stack,
      );
      sensor.sync_status = SensorStatus.ERROR;
      sensor.sync_error = error.message;
    }

    // Save sensor updates
    await this.sensorRepository.save(sensor);
  }

  /**
   * Sync readings for a device using historic logs
   * Since real-time logs endpoint is broken, we use historic logs for last 15 minutes
   */
  private async syncDeviceReadings(
    tenant: Tenant,
    sensor: Sensor,
  ): Promise<void> {
    if (!tenant.ksp_contract_id) {
      throw new Error('Tenant has no KSP contract ID');
    }

    // Get historic logs for last 15 minutes
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 15 * 60 * 1000);

    this.logger.debug(
      `Fetching historic logs for device ${sensor.ksp_device_id} from ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );

    try {
      const historicLogs = await this.kspService.getDeviceHistoricLogs(
        tenant.ksp_contract_id,
        sensor.ksp_device_id,
        startTime,
        endTime,
        ['DT_co2', 'DT_temperature', 'DT_humidity', 'DT_serial_number'],
      );

      if (!historicLogs.historics || historicLogs.historics.length === 0) {
        this.logger.debug(`No recent logs for device ${sensor.ksp_device_id}`);
        return;
      }

      // Convert historic logs to realtime log format for parsing
      const realtimeLogs = this.convertHistoricToRealtimeLogs(
        historicLogs.historics,
        sensor.ksp_device_id,
      );

      // Parse logs into readings
      const parsedReadings = this.kspService.parseRealtimeLogs(realtimeLogs);

      if (parsedReadings.length === 0) {
        this.logger.debug(
          `No parsed readings for device ${sensor.ksp_device_id}`,
        );
        return;
      }

      // Get the latest reading
      const latestReading = parsedReadings[0];

      // Update sensor serial number if we got it
      if (latestReading.serialNumber && !sensor.ksp_serial_number) {
        sensor.ksp_serial_number = latestReading.serialNumber;
      }

      // Check if reading already exists (avoid duplicates)
      const existingReading = await this.readingRepository.findOne({
        where: {
          sensor_id: sensor.id,
          timestamp: latestReading.timestamp,
        },
      });

      if (!existingReading && latestReading.co2 !== null) {
        // Create new reading
        const reading = new SensorReading();
        reading.sensor_id = sensor.id;
        reading.co2_level = latestReading.co2 || 0;
        reading.temperature = latestReading.temperature ?? null;
        reading.humidity = latestReading.humidity ?? null;
        reading.timestamp = latestReading.timestamp;
        reading.source = 2; // REMOTE

        await this.readingRepository.save(reading);

        // Update sensor's last reading fields (denormalized)
        sensor.last_reading_co2 = latestReading.co2;
        sensor.last_reading_temperature = latestReading.temperature ?? null;
        sensor.last_reading_humidity = latestReading.humidity ?? null;
        sensor.last_reading_at = latestReading.timestamp;

        this.logger.debug(
          `Saved reading for sensor ${sensor.id}: CO2=${latestReading.co2}ppm at ${latestReading.timestamp.toISOString()}`,
        );
      } else if (existingReading) {
        this.logger.debug(
          `Reading already exists for sensor ${sensor.id} at ${latestReading.timestamp.toISOString()}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error fetching historic logs for device ${sensor.ksp_device_id}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Convert historic logs to realtime log format for parsing
   */
  private convertHistoricToRealtimeLogs(
    historics: KspHistoricLog[],
    deviceId: string,
  ): KspRealtimeLog[] {
    const realtimeLogs: KspRealtimeLog[] = [];

    for (const historic of historics) {
      if (!historic.logs || historic.logs.length === 0) continue;

      // Get the most recent log entry for this tag
      const latestLog = historic.logs[historic.logs.length - 1];

      realtimeLogs.push({
        tagReference: historic.tagReference,
        value: latestLog.value,
        timestamp: latestLog.timestamp,
        isEvent: false,
        deviceIdentifier: deviceId,
      });
    }

    return realtimeLogs;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      enabled: this.syncEnabled,
      isSyncing: this.isSyncing,
      interval: this.configService.get('SENSOR_POLLING_INTERVAL_MS'),
    };
  }
}

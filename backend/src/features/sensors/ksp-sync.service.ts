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
   * Sync readings for a device using realtime logs
   * Gets the current sensor readings and stores them in the database
   */
  private async syncDeviceReadings(
    tenant: Tenant,
    sensor: Sensor,
  ): Promise<void> {
    if (!tenant.ksp_contract_id) {
      throw new Error('Tenant has no KSP contract ID');
    }

    this.logger.debug(
      `Fetching realtime logs for device ${sensor.ksp_device_id}`,
    );

    try {
      // Get current realtime readings (use Digital Twin tags)
      const realtimeResponse = await this.kspService.getDeviceRealtimeLogs(
        tenant.ksp_contract_id,
        sensor.ksp_device_id,
        ['DT_co2', 'DT_temperature', 'DT_humidity', 'DT_serial_number'],
      );

      // DEBUG: Log the full response from KSP API
      this.logger.debug(
        `KSP API Realtime Response for device ${sensor.ksp_device_id}: ${JSON.stringify(realtimeResponse)}`,
      );

      // Handle both old and new API response formats
      const logs = realtimeResponse.realtimeLogs || realtimeResponse.logs || [];

      if (!logs || logs.length === 0) {
        this.logger.debug(`No realtime logs for device ${sensor.ksp_device_id}`);
        return;
      }

      // Parse logs into readings
      const parsedReadings = this.kspService.parseRealtimeLogs(logs, realtimeResponse);

      if (parsedReadings.length === 0) {
        this.logger.debug(
          `No parsed readings for device ${sensor.ksp_device_id}`,
        );
        return;
      }

      // Get the current reading (realtime should only have one)
      const currentReading = parsedReadings[0];

      // Update sensor serial number if we got it
      if (currentReading.serialNumber && !sensor.ksp_serial_number) {
        sensor.ksp_serial_number = currentReading.serialNumber;
      }

      // Only save if we have CO2 data
      if (currentReading.co2 !== null) {
        // Check if reading already exists (avoid duplicates)
        const existingReading = await this.readingRepository.findOne({
          where: {
            sensor_id: sensor.id,
            timestamp: currentReading.timestamp,
          },
        });

        if (!existingReading) {
          // Create new reading
          const reading = new SensorReading();
          reading.sensor_id = sensor.id;
          reading.co2_level = Math.round(currentReading.co2);
          reading.temperature = currentReading.temperature ?? null;
          reading.humidity = currentReading.humidity ?? null;
          reading.timestamp = currentReading.timestamp;
          reading.source = 2; // REMOTE

          await this.readingRepository.save(reading);

          this.logger.log(
            `✅ Saved realtime reading for sensor ${sensor.name}: CO2=${currentReading.co2}ppm, Temp=${currentReading.temperature}°C, Humidity=${currentReading.humidity}% at ${currentReading.timestamp.toISOString()}`,
          );
        } else {
          this.logger.debug(
            `Reading already exists for sensor ${sensor.id} at ${currentReading.timestamp.toISOString()}`,
          );
        }

        // Always update sensor's last reading fields from the current data
        sensor.last_reading_co2 = Math.round(currentReading.co2);
        sensor.last_reading_temperature = currentReading.temperature ?? null;
        sensor.last_reading_humidity = currentReading.humidity ?? null;
        sensor.last_reading_at = currentReading.timestamp;
      }
    } catch (error) {
      this.logger.error(
        `Error fetching realtime logs for device ${sensor.ksp_device_id}`,
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
   * Convert all historic logs to readings (not just the latest)
   */
  private convertAllHistoricLogsToReadings(
    historics: KspHistoricLog[],
  ): any[] {
    // Group logs by timestamp
    const timestampMap = new Map<number, any>();

    for (const historic of historics) {
      if (!historic.logs || historic.logs.length === 0) continue;

      // Process ALL log entries, not just the latest
      for (const log of historic.logs) {
        if (!timestampMap.has(log.timestamp)) {
          timestampMap.set(log.timestamp, {
            timestamp: log.timestamp,
            source: log.source,
            co2: null,
            temperature: null,
            humidity: null,
          });
        }

        const reading = timestampMap.get(log.timestamp);

        // Map tag reference to reading field
        switch (historic.tagReference) {
          case 'p_CO2':
            reading.co2 = parseFloat(log.value);
            break;
          case 'p_temperature':
            reading.temperature = parseFloat(log.value);
            break;
          case 'p_humidity':
            reading.humidity = parseFloat(log.value);
            break;
        }
      }
    }

    // Convert to array and sort by timestamp (oldest first)
    return Array.from(timestampMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  }

  /**
   * Sync historical data for a specific sensor
   * This fetches and stores historical readings over a specified period
   */
  async syncSensorHistory(
    sensorId: string,
    daysBack: number = 30,
  ): Promise<{ success: boolean; readingsImported: number; message: string }> {
    this.logger.log(
      `Starting historical sync for sensor ${sensorId} (${daysBack} days back)`,
    );

    // Find the sensor
    const sensor = await this.sensorRepository.findOne({
      where: { id: sensorId },
      relations: ['tenant'],
    });

    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found`);
    }

    if (!sensor.tenant?.ksp_contract_id) {
      throw new Error(
        `Sensor ${sensorId} has no associated tenant with KSP contract ID`,
      );
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - daysBack * 24 * 60 * 60 * 1000);

    this.logger.log(
      `Fetching historical data from ${startTime.toISOString()} to ${endTime.toISOString()}`,
    );

    try {
      // Fetch historical data from KSP
      const historicLogs = await this.kspService.getDeviceHistoricLogs(
        sensor.tenant.ksp_contract_id,
        sensor.ksp_device_id,
        startTime,
        endTime,
        ['DT_co2', 'DT_temperature', 'DT_humidity'],
      );

      if (!historicLogs.historics || historicLogs.historics.length === 0) {
        this.logger.warn(
          `No historical data found for sensor ${sensorId} (device ${sensor.ksp_device_id})`,
        );
        return {
          success: true,
          readingsImported: 0,
          message: 'No historical data available',
        };
      }

      // Convert all historic logs to readings
      const readings = this.convertAllHistoricLogsToReadings(
        historicLogs.historics,
      );

      this.logger.log(`Processing ${readings.length} historical readings`);

      let importedCount = 0;
      let skippedCount = 0;

      // Insert readings in batches to avoid overwhelming the database
      const batchSize = 500;
      for (let i = 0; i < readings.length; i += batchSize) {
        const batch = readings.slice(i, i + batchSize);

        for (const reading of batch) {
          // Skip readings without CO2 data
          if (reading.co2 === null || reading.co2 === undefined) {
            skippedCount++;
            continue;
          }

          // Convert KSP timestamp to Date
          const timestamp = this.kspService.kspTimestampToDate(
            reading.timestamp,
          );

          // Check if reading already exists
          const exists = await this.readingRepository.findOne({
            where: {
              sensor_id: sensor.id,
              timestamp: timestamp,
            },
          });

          if (exists) {
            skippedCount++;
            continue;
          }

          // Create and save new reading
          const newReading = new SensorReading();
          newReading.sensor_id = sensor.id;
          newReading.co2_level = Math.round(reading.co2);
          newReading.temperature = reading.temperature ?? null;
          newReading.humidity = reading.humidity ?? null;
          newReading.timestamp = timestamp;
          newReading.source = reading.source || 2; // Default to REMOTE

          await this.readingRepository.save(newReading);
          importedCount++;
        }

        this.logger.debug(
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(readings.length / batchSize)}: ${importedCount} imported, ${skippedCount} skipped`,
        );
      }

      // Update sensor's last reading if we imported data
      if (importedCount > 0) {
        const latestReading = await this.readingRepository.findOne({
          where: { sensor_id: sensor.id },
          order: { timestamp: 'DESC' },
        });

        if (latestReading) {
          sensor.last_reading_co2 = latestReading.co2_level;
          sensor.last_reading_temperature = latestReading.temperature;
          sensor.last_reading_humidity = latestReading.humidity;
          sensor.last_reading_at = latestReading.timestamp;
          await this.sensorRepository.save(sensor);
        }
      }

      this.logger.log(
        `Historical sync completed for sensor ${sensorId}: ${importedCount} readings imported, ${skippedCount} skipped`,
      );

      return {
        success: true,
        readingsImported: importedCount,
        message: `Successfully imported ${importedCount} readings (${skippedCount} duplicates skipped)`,
      };
    } catch (error) {
      this.logger.error(
        `Error syncing historical data for sensor ${sensorId}`,
        error.stack,
      );
      throw error;
    }
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

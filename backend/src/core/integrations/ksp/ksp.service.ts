import { Injectable, Logger } from '@nestjs/common';
import { KspAuthService } from './ksp-auth.service';
import {
  KspContractsResponse,
  KspDevicesResponse,
  KspDeviceResponse,
  KspRealtimeLogsResponse,
  KspHistoricLogsResponse,
  KspEventLogsResponse,
  KspGroupsResponse,
  KspGroupResponse,
  KspRealtimeLogsParams,
  KspHistoricLogsParams,
  KspTagReference,
  ParsedSensorReading,
  KspRealtimeLog,
} from './ksp.types';
import { AxiosInstance } from 'axios';

@Injectable()
export class KspService {
  private readonly logger = new Logger(KspService.name);

  // Timestamp base: 2000-01-01 00:00:00 UTC
  private readonly KSP_EPOCH = new Date('2000-01-01T00:00:00Z').getTime();

  constructor(private kspAuthService: KspAuthService) {}

  /**
   * Convert KSP timestamp to JavaScript Date
   * KSP timestamps are seconds since 2000-01-01 00:00:00
   */
  public kspTimestampToDate(kspTimestamp: number): Date {
    return new Date(this.KSP_EPOCH + kspTimestamp * 1000);
  }

  /**
   * Convert JavaScript Date to KSP timestamp
   */
  public dateToKspTimestamp(date: Date): number {
    return Math.floor((date.getTime() - this.KSP_EPOCH) / 1000);
  }

  /**
   * Get authenticated client
   */
  private async getClient(): Promise<AxiosInstance> {
    return await this.kspAuthService.getAuthenticatedClient();
  }

  // ============= CONTRACTS =============

  async getContracts(): Promise<KspContractsResponse> {
    const client = await this.getClient();
    const response = await client.get<KspContractsResponse>('/contracts');
    return response.data;
  }

  // ============= DEVICES =============

  async getDevices(contractId: string): Promise<KspDevicesResponse> {
    const client = await this.getClient();
    const response = await client.get<KspDevicesResponse>('/devices', {
      params: { contractId },
    });
    return response.data;
  }

  async getDevice(contractId: string, deviceId: string): Promise<KspDeviceResponse> {
    const client = await this.getClient();
    const response = await client.get<KspDeviceResponse>('/device', {
      params: { contractId, deviceId },
    });
    return response.data;
  }

  // ============= REAL-TIME LOGS =============

  /**
   * Get real-time logs for a single device
   */
  async getDeviceRealtimeLogs(
    contractId: string,
    deviceId: string,
    tagReferences?: string[],
  ): Promise<KspRealtimeLogsResponse> {
    const client = await this.getClient();

    const params: any = {
      contractId,
      deviceId,
    };

    // Add tagReferences if provided (optional parameter)
    if (tagReferences && tagReferences.length > 0) {
      params.tagReferences = tagReferences;
    }

    // Build query string manually to match KSP API expectations
    const queryParams = new URLSearchParams();
    queryParams.append('contractId', contractId);
    queryParams.append('deviceId', deviceId);

    if (tagReferences && tagReferences.length > 0) {
      // Add each tag reference as separate param
      tagReferences.forEach(tag => queryParams.append('tagReferences', tag));
    }

    const url = `/devices/realtimes?${queryParams.toString()}`;
    this.logger.debug(`GET ${url}`);

    const response = await client.get<KspRealtimeLogsResponse>(url);
    this.logger.debug(`Realtime logs response:`, JSON.stringify(response.data));
    return response.data;
  }

  /**
   * Get real-time logs for multiple devices (OPTIMIZED - 1 API call)
   * This is THE method to use for polling!
   */
  async getMultipleDevicesRealtimeLogs(
    contractId: string,
    deviceIdentifiers: string[],
    tagReferences?: string[],
  ): Promise<KspRealtimeLogsResponse> {
    const client = await this.getClient();

    const tags = tagReferences || [
      KspTagReference.CO2,
      KspTagReference.TEMPERATURE,
      KspTagReference.HUMIDITY,
      KspTagReference.SERIAL_NUMBER,
    ];

    // Try simple array format instead of comma-separated strings
    const body = {
      DeviceIdentifier: deviceIdentifiers,
      TagReference: tags,
    };

    this.logger.debug('POST /devices/realtimes', { contractId, body });

    try {
      const response = await client.post<KspRealtimeLogsResponse>(
        '/devices/realtimes',
        body,
        {
          params: { contractId },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('KSP realtime API error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        body: body,
        contractId: contractId,
      });
      throw error;
    }
  }

  /**
   * Parse real-time logs into structured sensor readings
   */
  parseRealtimeLogs(logs: KspRealtimeLog[], responseData?: KspRealtimeLogsResponse): ParsedSensorReading[] {
    // Handle new API format where logs are in realtimeLogs array
    const logsArray = logs || responseData?.realtimeLogs || responseData?.logs || [];

    if (logsArray.length === 0) {
      this.logger.debug('No realtime logs found in response');
      return [];
    }

    this.logger.debug(`Parsing ${logsArray.length} realtime logs`);

    // Group by device (use "default" if no deviceIdentifier for single device queries)
    const deviceMap = new Map<string, Partial<ParsedSensorReading>>();

    for (const log of logsArray) {
      // Use deviceIdentifier if present, otherwise use "default" for single device queries
      const deviceId = log.deviceIdentifier || 'default';

      if (!deviceMap.has(deviceId)) {
        // Parse timestamp - handle both number (seconds since 2000) and ISO string
        let timestamp: Date;
        if (typeof log.timestamp === 'number') {
          timestamp = this.kspTimestampToDate(log.timestamp);
        } else if ((log as any).datetime) {
          // New API format uses "datetime" instead of "timestamp"
          timestamp = new Date((log as any).datetime);
        } else {
          timestamp = new Date();
        }

        deviceMap.set(deviceId, {
          deviceId,
          co2: null,
          temperature: null,
          humidity: null,
          serialNumber: null,
          timestamp: timestamp,
        });
      }

      const reading = deviceMap.get(deviceId);
      if (!reading) continue;

      switch (log.tagReference) {
        case KspTagReference.CO2:
        case 'p_CO2':
        case 'DT_co2':
          reading.co2 = parseFloat(log.value);
          break;
        case KspTagReference.TEMPERATURE:
        case 'p_temperature':
        case 'DT_temperature':
          reading.temperature = parseFloat(log.value);
          break;
        case KspTagReference.HUMIDITY:
        case 'p_humidity':
        case 'DT_humidity':
          reading.humidity = parseFloat(log.value);
          break;
        case KspTagReference.SERIAL_NUMBER:
        case 'sys_device_sn':
        case 'DT_serial_number':
          reading.serialNumber = log.value;
          break;
      }

      // Update timestamp to most recent
      let logDate: Date;
      if (typeof log.timestamp === 'number') {
        logDate = this.kspTimestampToDate(log.timestamp);
      } else if ((log as any).datetime) {
        logDate = new Date((log as any).datetime);
      } else {
        logDate = new Date();
      }

      if (reading.timestamp && logDate > reading.timestamp) {
        reading.timestamp = logDate;
      }
    }

    return Array.from(deviceMap.values()) as ParsedSensorReading[];
  }

  // ============= HISTORIC LOGS =============

  /**
   * Get historic logs for a single device
   */
  async getDeviceHistoricLogs(
    contractId: string,
    deviceId: string,
    startTime: Date,
    endTime?: Date,
    tagReferences?: string[],
  ): Promise<KspHistoricLogsResponse> {
    const client = await this.getClient();

    const params: any = {
      contractId,
      deviceId,
      startTime: this.dateToKspTimestamp(startTime),
    };

    if (endTime) {
      params.endTime = this.dateToKspTimestamp(endTime);
    }

    if (tagReferences) {
      params.tagReferences = tagReferences.join(',');
    }

    const response = await client.get<KspHistoricLogsResponse>('/devices/historics', {
      params,
    });

    return response.data;
  }

  /**
   * Get historic logs for multiple devices
   */
  async getMultipleDevicesHistoricLogs(
    contractId: string,
    deviceIdentifiers: string[],
    startTime: Date,
    endTime?: Date,
    tagReferences?: string[],
  ): Promise<KspHistoricLogsResponse> {
    const client = await this.getClient();

    const tags = tagReferences || [
      KspTagReference.CO2,
      KspTagReference.TEMPERATURE,
      KspTagReference.HUMIDITY,
    ];

    const body: any = {
      DeviceIdentifier: deviceIdentifiers,
      StartTime: this.dateToKspTimestamp(startTime),
      TagReference: tags,
    };

    if (endTime) {
      body.EndTime = this.dateToKspTimestamp(endTime);
    }

    const response = await client.post<KspHistoricLogsResponse>(
      '/devices/historics',
      body,
      { params: { contractId } },
    );

    return response.data;
  }

  // ============= EVENT LOGS =============

  async getDeviceEventLogs(
    contractId: string,
    deviceId: string,
    startTime: Date,
    endTime?: Date,
    tagReferences?: string[],
  ): Promise<KspEventLogsResponse> {
    const client = await this.getClient();

    const params: any = {
      contractId,
      deviceId,
      startTime: this.dateToKspTimestamp(startTime),
    };

    if (endTime) {
      params.endTime = this.dateToKspTimestamp(endTime);
    }

    if (tagReferences) {
      params.tagReferences = tagReferences.join(',');
    }

    const response = await client.get<KspEventLogsResponse>('/devices/events', {
      params,
    });

    return response.data;
  }

  // ============= GROUPS =============

  async getGroups(contractId: string): Promise<KspGroupsResponse> {
    const client = await this.getClient();
    const response = await client.get<KspGroupsResponse>('/groups', {
      params: { contractId },
    });
    return response.data;
  }

  async getGroup(contractId: string, groupId: string): Promise<KspGroupResponse> {
    const client = await this.getClient();
    const response = await client.get<KspGroupResponse>('/group', {
      params: { contractId, groupId },
    });
    return response.data;
  }

  // ============= TAG WRITING (if needed later) =============

  async writeTag(
    contractId: string,
    deviceId: string,
    tagRef: string,
    value: string,
  ): Promise<void> {
    const client = await this.getClient();
    await client.post(
      '/devices/tags/write',
      {},
      {
        params: { contractId, deviceId, tagRef, value },
      },
    );
  }
}

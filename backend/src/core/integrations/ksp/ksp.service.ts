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

  // Timestamp base: 2000-01-01 00:00:00
  private readonly KSP_EPOCH = new Date('2000-01-01T00:00:00Z').getTime();

  constructor(private kspAuthService: KspAuthService) {}

  /**
   * Convert KSP timestamp to JavaScript Date
   * KSP timestamps are seconds since 2000-01-01 00:00:00
   */
  private kspTimestampToDate(kspTimestamp: number): Date {
    return new Date(this.KSP_EPOCH + kspTimestamp * 1000);
  }

  /**
   * Convert JavaScript Date to KSP timestamp
   */
  private dateToKspTimestamp(date: Date): number {
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
    this.logger.debug('GET', url);

    const response = await client.get<KspRealtimeLogsResponse>(url);
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

    // KSP API expects arrays of strings joined with commas inside array
    // Format: {"DeviceIdentifier": ["1, 2"], "TagReference": ["TAG_1, TAG_2"]}
    const body = {
      DeviceIdentifier: [deviceIdentifiers.join(', ')],
      TagReference: [tags.join(', ')],
    };

    this.logger.debug('POST /devices/realtimes', { contractId, body });

    const response = await client.post<KspRealtimeLogsResponse>(
      '/devices/realtimes',
      body,
      {
        params: { contractId },
      },
    );

    return response.data;
  }

  /**
   * Parse real-time logs into structured sensor readings
   */
  parseRealtimeLogs(logs: KspRealtimeLog[]): ParsedSensorReading[] {
    // Group by device
    const deviceMap = new Map<string, Partial<ParsedSensorReading>>();

    for (const log of logs) {
      const deviceId = log.deviceIdentifier;
      if (!deviceId) continue;

      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          deviceId,
          co2: null,
          temperature: null,
          humidity: null,
          serialNumber: null,
          timestamp: this.kspTimestampToDate(log.timestamp),
        });
      }

      const reading = deviceMap.get(deviceId);
      if (!reading) continue;

      switch (log.tagReference) {
        case KspTagReference.CO2:
          reading.co2 = parseFloat(log.value);
          break;
        case KspTagReference.TEMPERATURE:
          reading.temperature = parseFloat(log.value);
          break;
        case KspTagReference.HUMIDITY:
          reading.humidity = parseFloat(log.value);
          break;
        case KspTagReference.SERIAL_NUMBER:
          reading.serialNumber = log.value;
          break;
      }

      // Update timestamp to most recent
      const logDate = this.kspTimestampToDate(log.timestamp);
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

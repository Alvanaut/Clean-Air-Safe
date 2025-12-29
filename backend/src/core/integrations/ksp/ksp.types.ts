/**
 * KSP API Types - Based on Kheiron Service Platform API v1.17.1
 */

// Authentication
export interface KspAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  userName: string;
  '.issued': string;
  '.expires': string;
}

// Contracts (Applications)
export interface KspContract {
  id: string;
  reference: string;
  company: string;
  details: string;
  contactEmail: string;
}

export interface KspContractsResponse {
  contracts: KspContract[];
}

// Devices (DigitalTwins = Sensors)
export interface KspDevice {
  id: string;
  name: string;
  details: string;
  status: number; // 0 = active, 1 = inactive, 2 = suspended
  timezone: string;
}

export interface KspDevicesResponse {
  devices: KspDevice[];
}

export interface KspDeviceResponse {
  device: KspDevice;
}

// Real-time Logs (Current sensor readings)
export interface KspRealtimeLog {
  tagReference: string; // e.g., "DT_co2", "DT_temperature", "DT_humidity"
  value: string;
  timestamp: number; // Seconds since 2000-01-01 00:00:00 UTC
  isEvent: boolean;
  deviceIdentifier?: string; // Only in multiple devices response
}

export interface KspRealtimeLogsResponse {
  logs?: KspRealtimeLog[]; // Old format (deprecated?)
  realtimeLogs?: KspRealtimeLog[]; // New format
  historicLogs?: any[]; // May be present but empty
  eventLogs?: any[]; // May be present but empty
}

// Historic Logs
export interface KspLog {
  value: string;
  timestamp: number; // Seconds since 2000-01-01 00:00:00 (Local time)
  source: number; // 1 = Local (device), 2 = Remote (platform)
}

export interface KspHistoricLog {
  tagReference: string;
  deviceIdentifier?: string; // Only in multiple devices response
  logs: KspLog[];
}

export interface KspHistoricLogsResponse {
  historics: KspHistoricLog[];
  next?: string; // Pagination URL if more than 10000 logs
}

// Event Logs
export interface KspEventLog {
  value: boolean; // true = active, false = inactive
  timestamp: number;
  source: number; // 1 = Local, 2 = Remote
  status: number; // 0 = none, 1 = Acknowledged
}

export interface KspEventLogResponse {
  tagReference: string;
  deviceIdentifier?: string;
  logs: KspEventLog[];
}

export interface KspEventLogsResponse {
  events: KspEventLogResponse[];
  next?: string;
}

// Groups
export interface KspGroup {
  id: string;
  name: string;
  details: string;
  parentId: string | null;
  children?: KspGroup[];
  devices?: KspDevice[];
}

export interface KspGroupsResponse {
  groups: KspGroup[];
}

export interface KspGroupResponse {
  group: KspGroup;
}

// Tag References (based on actual API data)
export enum KspTagReference {
  CO2 = 'p_CO2',
  TEMPERATURE = 'p_temperature',
  HUMIDITY = 'p_humidity',
  SERIAL_NUMBER = 'sys_device_sn',
}

// Helper types for our use
export interface ParsedSensorReading {
  deviceId: string;
  co2: number | null;
  temperature: number | null;
  humidity: number | null;
  serialNumber: string | null;
  timestamp: Date;
}

// Request params
export interface KspRealtimeLogsParams {
  contractId: string;
  deviceId?: string;
  deviceIdentifiers?: string[];
  tagReferences?: string[];
}

export interface KspHistoricLogsParams {
  contractId: string;
  deviceId?: string;
  deviceIdentifiers?: string[];
  startTime: number; // Timestamp since 2000-01-01
  endTime?: number;
  tagReferences?: string[];
}

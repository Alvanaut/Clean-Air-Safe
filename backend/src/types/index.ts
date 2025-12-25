export interface KheironRealtimeLog {
    deviceIdentifier: string
    tagReference: string
    value: string
    timestamp: number
    isEvent: boolean
  }

  export interface KheironRealtimeResponse {
    logs: KheironRealtimeLog[]
  }

  export interface KheironAuthResponse {
    access_token: string
    token_type: string
    expires_in: number
    userName: string
    '.issued': string
    '.expires': string
  }

  export interface SensorData {
    deviceId: string
    co2?: number
    temperature?: number
    humidity?: number
    timestamp: number
    lastPoll: number
  }

  export interface ProcessedSensorData {
    [deviceId: string]: SensorData
  }
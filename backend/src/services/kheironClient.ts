import axios from 'axios'
  import { env } from '../config/env.js'
  import { logger } from '../utils/logger.js'
  import type {
    KheironAuthResponse,
    KheironRealtimeResponse,
    ProcessedSensorData
  } from '../types/index.js'

  const API_BASE = 'https://api.kheiron-sp.io'
  const API_URL = `${API_BASE}/v1`

  export class KheironClient {
    private api: ReturnType<typeof axios.create>
    private token: string | null = null
    private tokenExpiry: number = 0

    constructor() {
      this.api = axios.create({
        baseURL: API_URL,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
    }

    private async authenticate(): Promise<void> {
      try {
        const response = await axios.post<KheironAuthResponse>(
          `${API_BASE}/token`,
          new URLSearchParams({
            grant_type: 'password',
            username: env.KHEIRON_USERNAME,
            password: env.KHEIRON_PASSWORD
          }).toString(),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        )

        this.token = response.data.access_token
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000)

        logger.info('✅ Kheiron authenticated')
      } catch (error) {
        logger.error('❌ Kheiron authentication failed:', error)
        throw error
      }
    }

    private async ensureAuthenticated(): Promise<void> {
      if (!this.token || Date.now() >= this.tokenExpiry - 60000) {
        await this.authenticate()
      }
    }

    async getRealtimeData(
      contractId: string,
      deviceIds: string[],
      tagReferences: string[] = ['DT_co2', 'DT_temperature', 'DT_humidity']
    ): Promise<ProcessedSensorData> {
      await this.ensureAuthenticated()

      try {
        const response = await this.api.post<KheironRealtimeResponse>(
          `/devices/realtimes?contractId=${contractId}`,
          {
            DeviceIdentifier: deviceIds,
            TagReference: tagReferences
          },
          {
            headers: { Authorization: `Bearer ${this.token}` }
          }
        )

        return this.processRealtimeData(response.data)
      } catch (error) {
        logger.error('❌ Failed to fetch realtime data:', error)
        throw error
      }
    }
    async getRealtimeDataSingle(
        contractId: string,
        deviceId: string,
        tagReferences: string[] = ['DT_co2', 'DT_temperature', 'DT_humidity']
      ): Promise<ProcessedSensorData> {
        await this.ensureAuthenticated()
    
        try {
          const tagsParam = tagReferences.map(t => `tagReferences=${t}`).join('&')
    
          const response = await this.api.get<KheironRealtimeResponse>(
            `/devices/realtimes?contractId=${contractId}&deviceId=${deviceId}&${tagsParam}`,
            {
              headers: { Authorization: `Bearer ${this.token}` }
            }
          )
    
          return this.processRealtimeData(response.data)
        } catch (error) {
          logger.error(`❌ Failed to fetch realtime data for device ${deviceId}:`, error)
          throw error
        }
      }
    
      // Nouvelle méthode pour plusieurs devices (avec GET en parallèle)
      async getRealtimeDataMultiple(
        contractId: string,
        deviceIds: string[],
        tagReferences: string[] = ['DT_co2', 'DT_temperature', 'DT_humidity']
      ): Promise<ProcessedSensorData> {
        await this.ensureAuthenticated()
    
        try {
          // Faire un GET par device en parallèle
          const promises = deviceIds.map(id =>
            this.getRealtimeDataSingle(contractId, id, tagReferences)
          )
    
          const results = await Promise.all(promises)
    
          // Fusionner tous les résultats
          const merged: ProcessedSensorData = {}
          results.forEach(result => {
            Object.assign(merged, result)
          })
    
          return merged
        } catch (error) {
          logger.error('❌ Failed to fetch realtime data for multiple devices:', error)
          throw error
        }
      }

    private processRealtimeData(response: KheironRealtimeResponse): ProcessedSensorData {
      const byDevice: ProcessedSensorData = {}

      for (const log of response.logs) {
        if (!byDevice[log.deviceIdentifier]) {
          byDevice[log.deviceIdentifier] = {
            deviceId: log.deviceIdentifier,
            timestamp: log.timestamp,
            lastPoll: Date.now()
          }
        }

        const value = parseFloat(log.value)

        switch (log.tagReference) {
          case 'DT_co2':
            byDevice[log.deviceIdentifier].co2 = value
            break
          case 'DT_temperature':
            byDevice[log.deviceIdentifier].temperature = value
            break
          case 'DT_humidity':
            byDevice[log.deviceIdentifier].humidity = value
            break
        }
      }

      return byDevice
    }
  }

  export const kheironClient = new KheironClient()
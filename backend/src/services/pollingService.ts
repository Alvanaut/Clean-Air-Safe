import cron from 'node-cron'
import { kheironClient } from './kheironClient.js'
import { CacheService } from './cacheService.js'
import { prisma } from '../db/prisma.js'
import { logger } from '../utils/logger.js'
import { env } from '../config/env.js'

export class PollingService {
  private isPolling = false

  start() {
    cron.schedule('*/10 * * * *', async () => {
      await this.poll()
    })

    this.poll()

    logger.info('🔄 Polling service started (every 10 min)')
  }

  async poll() {
    if (this.isPolling) {
      logger.warn('⚠️  Poll already in progress, skipping')
      return
    }

    this.isPolling = true
    const startTime = Date.now()

    try {
      const sensors = await prisma.sensor.findMany({
        where: { status: 'active' },
        select: { deviceId: true, id: true }
      })

      if (sensors.length === 0) {
        logger.info('No active sensors found')
        return
      }

      const deviceIds = sensors.map(s => s.deviceId)

      logger.info(`📡 Polling ${deviceIds.length} sensors...`)

      const contractId = env.KHEIRON_CONTRACT_ID
      const data = await kheironClient.getRealtimeDataMultiple(contractId, deviceIds)

      await CacheService.setSensorsData(data)

      const measurements = Object.values(data)
        .filter(d => d.co2 !== undefined)
        .map(d => {
          const sensor = sensors.find(s => s.deviceId === d.deviceId)
          return {
            sensorId: sensor!.id,
            co2Ppm: d.co2!,
            temperature: d.temperature,
            humidity: d.humidity,
            timestamp: new Date(d.timestamp * 1000 + new Date('2000-01-01').getTime()),
            source: 'remote'
          }
        })

      await prisma.measurement.createMany({
        data: measurements,
        skipDuplicates: true
      })

      const duration = Date.now() - startTime
      logger.info(`✅ Poll completed in ${duration}ms - ${measurements.length} measurements`)

    } catch (error) {
      logger.error('❌ Poll failed:', error)
    } finally {
      this.isPolling = false
    }
  }
}

export const pollingService = new PollingService()
import Redis from 'ioredis'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

export const redis = new Redis(env.REDIS_URL)

redis.on('connect', () => logger.info('✅ Redis connected'))
redis.on('error', (err) => logger.error('❌ Redis error:', err))

export class CacheService {
  private static TTL = 720

  static async setSensorData(sensorId: string, data: any) {
    const key = `sensor:${sensorId}:realtime`
    await redis.setex(key, this.TTL, JSON.stringify(data))
  }

  static async getSensorData(sensorId: string) {
    const key = `sensor:${sensorId}:realtime`
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  }

  static async setSensorsData(sensors: Record<string, any>) {
    const pipeline = redis.pipeline()

    for (const [sensorId, data] of Object.entries(sensors)) {
      const key = `sensor:${sensorId}:realtime`
      pipeline.setex(key, this.TTL, JSON.stringify(data))
    }

    await pipeline.exec()
  }
}
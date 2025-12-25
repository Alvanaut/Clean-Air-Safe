import { Router } from 'express'
  import { prisma } from '../db/prisma.js'
  import { redis } from '../services/cacheService.js'

  export const healthRouter = Router()

  healthRouter.get('/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      await redis.ping()

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          redis: 'connected'
        }
      })
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
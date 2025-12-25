import { PrismaClient } from '@prisma/client'
  import { logger } from '../utils/logger.js'

  export const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  })

  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e: any) => {
      logger.debug(`Query: ${e.query}`)
    })
  }

  prisma.$connect()
    .then(() => logger.info('✅ Database connected'))
    .catch((err) => logger.error('❌ Database connection failed:', err))
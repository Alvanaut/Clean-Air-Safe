import { createApp } from './server.js'
import { env } from './config/env.js'
import { logger } from './utils/logger.js'
import { pollingService } from './services/pollingService.js'
import './db/prisma.js'

const { httpServer } = createApp()

httpServer.listen(env.PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${env.PORT}`)
  logger.info(`📊 Environment: ${env.NODE_ENV}`)
})

pollingService.start()

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  httpServer.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})
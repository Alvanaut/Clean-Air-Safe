import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { apiRouter } from './routes/index.js'
import { env } from './config/env.js'

export function createApp() {
  const app = express()
  const httpServer = createServer(app)
  const io = new Server(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'development' ? '*' : 'https://votre-domaine.com',
      methods: ['GET', 'POST']
    }
  })

  // Middleware
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Routes
  app.use('/api', apiRouter)

  // WebSocket
  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id)

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
    })
  })

  return { app, httpServer, io }
}
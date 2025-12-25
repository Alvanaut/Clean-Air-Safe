import type { Request, Response } from 'express'
import { prisma } from '../db/prisma.js'
import { logger } from '../utils/logger.js'

/**
 * 📖 ALERT CONTROLLER
 * Gère les alertes avec système d'escalade automatique
 *
 * Règles d'escalade :
 * - Si non acquittée après X minutes → escalade au manager
 * - Continue jusqu'au top de la hiérarchie
 */

export class AlertController {
  /**
   * GET /api/alerts
   * Liste toutes les alertes
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { sensorId, status, severity, userId } = req.query

      const alerts = await prisma.alert.findMany({
        where: {
          ...(sensorId && { sensorId: String(sensorId) }),
          ...(status && { status: String(status) }),
          ...(userId && { assignedToId: String(userId) })
        },
        include: {
          sensor: {
            select: {
              id: true,
              name: true,
              deviceId: true,
              space: {
                select: {
                  id: true,
                  name: true,
                  path: true
                }
              }
            }
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      logger.info(`📊 Fetched ${alerts.length} alerts`)

      return res.status(200).json({
        success: true,
        count: alerts.length,
        data: alerts
      })
    } catch (error) {
      logger.error('❌ Error fetching alerts:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch alerts'
      })
    }
  }

  /**
   * GET /api/alerts/:id
   * Récupère une alerte spécifique
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params

      const alert = await prisma.alert.findUnique({
        where: { id },
        include: {
          sensor: {
            include: {
              space: true,
              responsible: true
            }
          },
          assignedTo: true
        }
      })

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        })
      }

      logger.info(`✅ Fetched alert ${id}`)

      return res.status(200).json({
        success: true,
        data: alert
      })
    } catch (error) {
      logger.error('❌ Error fetching alert:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch alert'
      })
    }
  }

  /**
   * POST /api/alerts
   * Crée une nouvelle alerte
   */
  static async create(req: Request, res: Response) {
    try {
      const { sensorId, type, level, value, threshold } = req.body

      // Récupère le capteur et son responsable
      const sensor = await prisma.sensor.findUnique({
        where: { id: sensorId },
        include: {
          responsible: true
        }
      })

      if (!sensor) {
        return res.status(404).json({
          success: false,
          error: 'Sensor not found'
        })
      }

      // Crée l'alerte assignée au responsable du capteur
      const alert = await prisma.alert.create({
        data: {
          sensorId,
          assignedToId: sensor.responsibleId,
          type,
          level,
          value: parseFloat(value),
          threshold,
          status: 'pending',
          escalationHistory: []
        },
        include: {
          sensor: true,
          assignedTo: true
        }
      })

      logger.info(`🚨 Created alert ${alert.id} for sensor ${sensorId}`)

      return res.status(201).json({
        success: true,
        data: alert
      })
    } catch (error) {
      logger.error('❌ Error creating alert:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create alert'
      })
    }
  }

  /**
   * PATCH /api/alerts/:id/acknowledge
   * Acquitte une alerte
   */
  static async acknowledge(req: Request, res: Response) {
    try {
      const { id } = req.params

      const alert = await prisma.alert.findUnique({
        where: { id }
      })

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        })
      }

      if (alert.status === 'resolved') {
        return res.status(400).json({
          success: false,
          error: 'Alert is already resolved'
        })
      }

      const updatedAlert = await prisma.alert.update({
        where: { id },
        data: {
          status: 'acknowledged',
          acknowledgedAt: new Date()
        },
        include: {
          sensor: true,
          assignedTo: true
        }
      })

      logger.info(`✅ Alert ${id} acknowledged`)

      return res.status(200).json({
        success: true,
        data: updatedAlert
      })
    } catch (error) {
      logger.error('❌ Error acknowledging alert:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      })
    }
  }

  /**
   * PATCH /api/alerts/:id/resolve
   * Résout une alerte
   */
  static async resolve(req: Request, res: Response) {
    try {
      const { id } = req.params

      const alert = await prisma.alert.findUnique({
        where: { id }
      })

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        })
      }

      const updatedAlert = await prisma.alert.update({
        where: { id },
        data: {
          status: 'resolved',
          resolvedAt: new Date()
        },
        include: {
          sensor: true,
          assignedTo: true
        }
      })

      logger.info(`✅ Alert ${id} resolved`)

      return res.status(200).json({
        success: true,
        data: updatedAlert
      })
    } catch (error) {
      logger.error('❌ Error resolving alert:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to resolve alert'
      })
    }
  }

  /**
   * POST /api/alerts/:id/escalate
   * Escalade manuellement une alerte au manager
   */
  static async escalate(req: Request, res: Response) {
    try {
      const { id } = req.params

      const alert = await prisma.alert.findUnique({
        where: { id },
        include: {
          assignedTo: {
            include: {
              manager: true
            }
          }
        }
      })

      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        })
      }

      if (alert.status === 'resolved') {
        return res.status(400).json({
          success: false,
          error: 'Resolved alerts cannot be escalated'
        })
      }

      if (!alert.assignedTo?.manager) {
        return res.status(400).json({
          success: false,
          error: 'No manager found for escalation'
        })
      }

      const escalationHistory = alert.escalationHistory as any[] || []
      escalationHistory.push({
        from: alert.assignedToId,
        to: alert.assignedTo.manager.id,
        escalatedAt: new Date()
      })

      const updatedAlert = await prisma.alert.update({
        where: { id },
        data: {
          assignedToId: alert.assignedTo.manager.id,
          escalationLevel: alert.escalationLevel + 1,
          escalationHistory
        },
        include: {
          sensor: true,
          assignedTo: true
        }
      })

      logger.info(`⬆️ Alert ${id} escalated to ${alert.assignedTo.manager.name}`)

      return res.status(200).json({
        success: true,
        data: updatedAlert
      })
    } catch (error) {
      logger.error('❌ Error escalating alert:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to escalate alert'
      })
    }
  }

  /**
   * 🔧 Fonction pour l'escalade automatique (appelée par un cron job)
   * Escalade toutes les alertes non acquittées après X minutes
   */
  static async autoEscalate(escalationThresholdMinutes: number = 30) {
    try {
      const threshold = new Date(Date.now() - escalationThresholdMinutes * 60 * 1000)

      const alertsToEscalate = await prisma.alert.findMany({
        where: {
          status: 'pending',
          createdAt: {
            lt: threshold
          },
          acknowledgedAt: null
        },
        include: {
          assignedTo: {
            include: {
              manager: true
            }
          }
        }
      })

      logger.info(`🔍 Found ${alertsToEscalate.length} alerts to auto-escalate`)

      for (const alert of alertsToEscalate) {
        if (alert.assignedTo?.manager) {
          const escalationHistory = alert.escalationHistory as any[] || []
          escalationHistory.push({
            from: alert.assignedToId,
            to: alert.assignedTo.manager.id,
            escalatedAt: new Date(),
            automatic: true
          })

          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              assignedToId: alert.assignedTo.manager.id,
              escalationLevel: alert.escalationLevel + 1,
              escalationHistory
            }
          })

          logger.info(`⬆️ Auto-escalated alert ${alert.id} to ${alert.assignedTo.manager.name}`)
        }
      }

      return alertsToEscalate.length
    } catch (error) {
      logger.error('❌ Error in auto-escalation:', error)
      throw error
    }
  }
}

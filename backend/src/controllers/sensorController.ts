import type { Request, Response } from 'express'
import { prisma } from '../db/prisma.js'
import { CacheService } from '../services/cacheService.js'
import { logger } from '../utils/logger.js'

/**
 * 📖 CONTROLLER = La logique métier de chaque route
 * Sépare la logique des routes pour un code plus propre et testable
 */

export class SensorController {
  /**
   * GET /api/sensors
   * Liste tous les capteurs
   */
  static async getAll(req: Request, res: Response) {
    try {
      // Query params pour filtrer (optionnel)
      const { companyId, spaceId } = req.query

      const sensors = await prisma.sensor.findMany({
        where: {
          ...(companyId && { companyId: String(companyId) }),
          ...(spaceId && { spaceId: String(spaceId) })
        },
        include: {
          space: true,
          company: true,
          responsible: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      logger.info(`📊 Fetched ${sensors.length} sensors`)

      return res.status(200).json({
        success: true,
        count: sensors.length,
        data: sensors
      })
    } catch (error) {
      logger.error('❌ Error fetching sensors:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sensors'
      })
    }
  }

  /**
   * GET /api/sensors/:id
   * Récupère un capteur spécifique avec ses données temps réel
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params

      const sensor = await prisma.sensor.findUnique({
        where: { id },
        include: {
          space: true,
          company: true,
          responsible: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      if (!sensor) {
        return res.status(404).json({
          success: false,
          error: 'Sensor not found'
        })
      }

      // Récupère les données temps réel depuis Redis (cache)
      const realtimeData = await CacheService.getSensorData(sensor.deviceId)

      logger.info(`✅ Fetched sensor ${id}`)

      return res.status(200).json({
        success: true,
        data: {
          ...sensor,
          realtime: realtimeData
        }
      })
    } catch (error) {
      logger.error('❌ Error fetching sensor:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch sensor'
      })
    }
  }

  /**
   * GET /api/sensors/:id/measurements
   * Récupère l'historique des mesures d'un capteur
   */
  static async getMeasurements(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { limit = '100', offset = '0', startDate, endDate } = req.query

      // Vérifie que le capteur existe
      const sensor = await prisma.sensor.findUnique({
        where: { id: String(id) }
      })

      if (!sensor) {
        return res.status(404).json({
          success: false,
          error: 'Sensor not found'
        })
      }

      // Construit les filtres de date
      const dateFilter: any = {}
      if (startDate) {
        dateFilter.gte = new Date(String(startDate))
      }
      if (endDate) {
        dateFilter.lte = new Date(String(endDate))
      }

      const measurements = await prisma.measurement.findMany({
        where: {
          sensorId: String(id),
          ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter })
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: parseInt(String(limit)),
        skip: parseInt(String(offset))
      })

      logger.info(`📈 Fetched ${measurements.length} measurements for sensor ${id}`)

      return res.status(200).json({
        success: true,
        count: measurements.length,
        data: measurements
      })
    } catch (error) {
      logger.error('❌ Error fetching measurements:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch measurements'
      })
    }
  }

  /**
   * POST /api/sensors
   * Crée un nouveau capteur
   */
  static async create(req: Request, res: Response) {
    try {
      const { deviceId, name, companyId, spaceId, responsibleId, qrCode } = req.body

      // Vérifie si le deviceId existe déjà
      const existing = await prisma.sensor.findUnique({
        where: { deviceId }
      })

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'Sensor with this deviceId already exists'
        })
      }

      const sensor = await prisma.sensor.create({
        data: {
          deviceId,
          name,
          companyId,
          spaceId,
          responsibleId,
          qrCode,
          status: 'active'
        },
        include: {
          space: true,
          company: true,
          responsible: true
        }
      })

      logger.info(`✅ Created sensor ${sensor.id} (deviceId: ${deviceId})`)

      return res.status(201).json({
        success: true,
        data: sensor
      })
    } catch (error) {
      logger.error('❌ Error creating sensor:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create sensor'
      })
    }
  }

  /**
   * PATCH /api/sensors/:id
   * Modifie un capteur existant
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, spaceId, responsibleId, status, qrCode } = req.body

      // Vérifie que le capteur existe
      const existing = await prisma.sensor.findUnique({
        where: { id }
      })

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Sensor not found'
        })
      }

      const sensor = await prisma.sensor.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(spaceId && { spaceId }),
          ...(responsibleId && { responsibleId }),
          ...(status && { status }),
          ...(qrCode !== undefined && { qrCode })
        },
        include: {
          space: true,
          company: true,
          responsible: true
        }
      })

      logger.info(`✅ Updated sensor ${id}`)

      return res.status(200).json({
        success: true,
        data: sensor
      })
    } catch (error) {
      logger.error('❌ Error updating sensor:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update sensor'
      })
    }
  }

  /**
   * DELETE /api/sensors/:id
   * Supprime un capteur (soft delete - change juste le status)
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

      // Vérifie que le capteur existe
      const existing = await prisma.sensor.findUnique({
        where: { id }
      })

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Sensor not found'
        })
      }

      // Soft delete : on change juste le status au lieu de supprimer
      const sensor = await prisma.sensor.update({
        where: { id },
        data: {
          status: 'inactive'
        }
      })

      logger.info(`🗑️ Deleted (soft) sensor ${id}`)

      return res.status(200).json({
        success: true,
        message: 'Sensor deleted successfully',
        data: sensor
      })
    } catch (error) {
      logger.error('❌ Error deleting sensor:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete sensor'
      })
    }
  }
}

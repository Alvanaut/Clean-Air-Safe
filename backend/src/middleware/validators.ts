import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { logger } from '../utils/logger.js'

/**
 * 📖 VALIDATION MIDDLEWARE
 * Vérifie que les données envoyées par le client sont correctes
 * Avant même d'arriver au controller !
 */

// 🎯 Schéma de validation pour créer un capteur
export const createSensorSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    name: z.string().min(3, 'Name must be at least 3 characters'),
    companyId: z.string().cuid('Invalid company ID'),
    spaceId: z.string().cuid('Invalid space ID').optional(),
    responsibleId: z.string().cuid('Invalid responsible ID').optional(),
    qrCode: z.string().optional()
  })
})

// 🎯 Schéma de validation pour modifier un capteur
export const updateSensorSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid sensor ID')
  }),
  body: z.object({
    name: z.string().min(3).optional(),
    spaceId: z.string().cuid().optional(),
    responsibleId: z.string().cuid().optional(),
    status: z.enum(['active', 'inactive', 'maintenance']).optional(),
    qrCode: z.string().optional()
  })
})

// 🎯 Schéma de validation pour les query params
export const getMeasurementsSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid sensor ID')
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
    offset: z.string().regex(/^\d+$/).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  })
})

/**
 * 🔧 Middleware factory pour valider les requêtes
 *
 * Exemple d'utilisation :
 * router.post('/sensors', validate(createSensorSchema), SensorController.create)
 */
export const validate = (schema: z.AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valide la requête (body, params, query)
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query
      })

      // ✅ Si la validation passe, continue vers le controller
      next()
    } catch (error) {
      // ❌ Si la validation échoue, renvoie une erreur 400
      if (error instanceof z.ZodError) {
        logger.warn('⚠️ Validation error:', error.errors)

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        })
      }

      // Erreur inattendue
      logger.error('❌ Unexpected validation error:', error)
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      })
    }
  }
}

// 🎯 Schémas de validation pour les utilisateurs
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.enum(['admin', 'manager', 'user'], {
      errorMap: () => ({ message: 'Role must be admin, manager, or user' })
    }),
    companyId: z.string().cuid('Invalid company ID'),
    managerId: z.string().cuid('Invalid manager ID').optional(),
    phone: z.string().optional()
  })
})

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid user ID')
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    role: z.enum(['admin', 'manager', 'user']).optional(),
    managerId: z.string().cuid().nullable().optional(),
    phone: z.string().optional(),
    password: z.string().min(8).optional()
  })
})

// 🎯 Schémas de validation pour les espaces
export const createSpaceSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    companyId: z.string().cuid('Invalid company ID'),
    parentId: z.string().cuid('Invalid parent ID').optional()
  })
})

export const updateSpaceSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid space ID')
  }),
  body: z.object({
    name: z.string().min(2).optional()
  })
})

// 🎯 Schémas de validation pour les alertes
export const createAlertSchema = z.object({
  body: z.object({
    sensorId: z.string().cuid('Invalid sensor ID'),
    type: z.string().min(1, 'Type is required'),
    level: z.string().min(1, 'Level is required'),
    value: z.number(),
    threshold: z.string()
  })
})

export const acknowledgeAlertSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid alert ID')
  })
})

export const resolveAlertSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid alert ID')
  })
})

/**
 * 📖 EXEMPLE D'ERREUR DE VALIDATION :
 *
 * Si tu envoies :
 * POST /api/sensors
 * {
 *   "deviceId": "",           ← Vide (erreur !)
 *   "name": "AB",            ← Trop court (erreur !)
 *   "companyId": "invalid"   ← Pas un UUID (erreur !)
 * }
 *
 * Tu reçois :
 * {
 *   "success": false,
 *   "error": "Validation failed",
 *   "details": [
 *     { "field": "body.deviceId", "message": "Device ID is required" },
 *     { "field": "body.name", "message": "Name must be at least 3 characters" },
 *     { "field": "body.companyId", "message": "Invalid company ID" }
 *   ]
 * }
 */

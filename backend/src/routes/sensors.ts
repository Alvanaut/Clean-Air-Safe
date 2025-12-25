import { Router } from 'express'
import { SensorController } from '../controllers/sensorController.js'
import { validate, createSensorSchema, updateSensorSchema, getMeasurementsSchema } from '../middleware/validators.js'

/**
 * 📖 ROUTES = Définit les URLs et associe les controllers
 *
 * Pattern REST API :
 * GET    /api/sensors              → Liste tous les capteurs
 * GET    /api/sensors/:id          → Un capteur spécifique
 * GET    /api/sensors/:id/measurements → Historique des mesures
 * POST   /api/sensors              → Crée un nouveau capteur
 * PATCH  /api/sensors/:id          → Modifie un capteur
 * DELETE /api/sensors/:id          → Supprime un capteur
 */

export const sensorsRouter = Router()

/**
 * 📚 EXPLICATION DU FLOW :
 *
 * Requête → Route → Validation → Controller → Réponse
 *
 * 1. La requête arrive sur une route (ex: GET /api/sensors)
 * 2. Le middleware de validation vérifie les données (si présent)
 * 3. Le controller traite la logique métier
 * 4. Le controller renvoie une réponse
 */

// GET /api/sensors
// Liste tous les capteurs (avec filtres optionnels)
sensorsRouter.get('/sensors', SensorController.getAll)

// GET /api/sensors/:id
// Récupère un capteur spécifique + données temps réel
sensorsRouter.get('/sensors/:id', SensorController.getById)

// GET /api/sensors/:id/measurements
// Récupère l'historique des mesures d'un capteur
sensorsRouter.get(
  '/sensors/:id/measurements',
  validate(getMeasurementsSchema),
  SensorController.getMeasurements
)

// POST /api/sensors
// Crée un nouveau capteur (avec validation)
sensorsRouter.post(
  '/sensors',
  validate(createSensorSchema),
  SensorController.create
)

// PATCH /api/sensors/:id
// Modifie un capteur existant (avec validation)
sensorsRouter.patch(
  '/sensors/:id',
  validate(updateSensorSchema),
  SensorController.update
)

// DELETE /api/sensors/:id
// Supprime un capteur (soft delete)
sensorsRouter.delete('/sensors/:id', SensorController.delete)

/**
 * 📖 EXEMPLES D'UTILISATION :
 *
 * 1️⃣ Récupérer tous les capteurs :
 *    GET http://localhost:8000/api/sensors
 *
 * 2️⃣ Récupérer les capteurs d'une entreprise :
 *    GET http://localhost:8000/api/sensors?companyId=xxx
 *
 * 3️⃣ Récupérer un capteur spécifique :
 *    GET http://localhost:8000/api/sensors/abc-123
 *
 * 4️⃣ Créer un nouveau capteur :
 *    POST http://localhost:8000/api/sensors
 *    Body: {
 *      "deviceId": "42",
 *      "name": "Capteur Bureau",
 *      "companyId": "uuid-company",
 *      "spaceId": "uuid-space"
 *    }
 *
 * 5️⃣ Modifier un capteur :
 *    PATCH http://localhost:8000/api/sensors/abc-123
 *    Body: {
 *      "name": "Nouveau nom",
 *      "status": "maintenance"
 *    }
 *
 * 6️⃣ Récupérer les mesures des 7 derniers jours :
 *    GET http://localhost:8000/api/sensors/abc-123/measurements?startDate=2025-12-18T00:00:00Z
 */

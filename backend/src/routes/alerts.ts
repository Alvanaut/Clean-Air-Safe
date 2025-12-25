import { Router } from 'express'
import { AlertController } from '../controllers/alertController.js'
import { validate, createAlertSchema, acknowledgeAlertSchema, resolveAlertSchema } from '../middleware/validators.js'

/**
 * 📖 ALERT ROUTES
 * Gère les alertes avec système d'escalade
 *
 * Routes :
 * GET    /api/alerts              → Liste toutes les alertes
 * GET    /api/alerts/:id          → Une alerte spécifique
 * POST   /api/alerts              → Crée une nouvelle alerte
 * PATCH  /api/alerts/:id/acknowledge → Acquitte une alerte
 * PATCH  /api/alerts/:id/resolve  → Résout une alerte
 * POST   /api/alerts/:id/escalate → Escalade manuellement une alerte
 */

export const alertsRouter = Router()

// GET /api/alerts
// Liste toutes les alertes (avec filtres optionnels)
alertsRouter.get('/alerts', AlertController.getAll)

// GET /api/alerts/:id
// Récupère une alerte spécifique
alertsRouter.get('/alerts/:id', AlertController.getById)

// POST /api/alerts
// Crée une nouvelle alerte (avec validation)
alertsRouter.post(
  '/alerts',
  validate(createAlertSchema),
  AlertController.create
)

// PATCH /api/alerts/:id/acknowledge
// Acquitte une alerte
alertsRouter.patch(
  '/alerts/:id/acknowledge',
  validate(acknowledgeAlertSchema),
  AlertController.acknowledge
)

// PATCH /api/alerts/:id/resolve
// Résout une alerte
alertsRouter.patch(
  '/alerts/:id/resolve',
  validate(resolveAlertSchema),
  AlertController.resolve
)

// POST /api/alerts/:id/escalate
// Escalade manuellement une alerte
alertsRouter.post('/alerts/:id/escalate', AlertController.escalate)

/**
 * 📖 EXEMPLES D'UTILISATION :
 *
 * 1️⃣ Récupérer toutes les alertes actives :
 *    GET /api/alerts?status=active
 *
 * 2️⃣ Récupérer les alertes critiques :
 *    GET /api/alerts?severity=critical
 *
 * 3️⃣ Récupérer les alertes d'un capteur :
 *    GET /api/alerts?sensorId=sensor-uuid
 *
 * 4️⃣ Récupérer les alertes d'un utilisateur :
 *    GET /api/alerts?userId=user-uuid
 *
 * 5️⃣ Créer une alerte :
 *    POST /api/alerts
 *    Body: {
 *      "sensorId": "sensor-uuid",
 *      "severity": "high",
 *      "message": "CO2 level exceeded 1000 ppm",
 *      "value": 1200,
 *      "threshold": 1000
 *    }
 *
 * 6️⃣ Acquitter une alerte :
 *    PATCH /api/alerts/alert-uuid/acknowledge
 *    Body: {
 *      "userId": "user-uuid",
 *      "notes": "En cours de traitement"
 *    }
 *
 * 7️⃣ Résoudre une alerte :
 *    PATCH /api/alerts/alert-uuid/resolve
 *    Body: {
 *      "notes": "Problème résolu - ventilation augmentée"
 *    }
 *
 * 8️⃣ Escalader une alerte :
 *    POST /api/alerts/alert-uuid/escalate
 *
 * 📚 SYSTÈME D'ESCALADE :
 *
 * Automatique (via cron job) :
 * - Si une alerte n'est pas acquittée après 30 minutes
 * - Elle est automatiquement escaladée au manager
 * - Continue jusqu'au top de la hiérarchie
 *
 * Exemple de flow :
 * 1. Alerte créée → assignée au responsable du capteur (User)
 * 2. Après 30 min sans acquittement → escalade au Manager
 * 3. Après 30 min sans acquittement → escalade au directeur (Admin)
 */

import { Router } from 'express'
import { SpaceController } from '../controllers/spaceController.js'
import { validate, createSpaceSchema, updateSpaceSchema } from '../middleware/validators.js'

/**
 * 📖 SPACE ROUTES
 * Gère les espaces avec hiérarchie (materialized path)
 *
 * Routes :
 * GET    /api/spaces              → Liste tous les espaces
 * GET    /api/spaces/:id          → Un espace spécifique
 * GET    /api/spaces/:id/tree     → Arbre hiérarchique complet
 * POST   /api/spaces              → Crée un nouvel espace
 * PATCH  /api/spaces/:id          → Modifie un espace
 * DELETE /api/spaces/:id          → Supprime un espace (+ enfants)
 */

export const spacesRouter = Router()

// GET /api/spaces
// Liste tous les espaces
spacesRouter.get('/spaces', SpaceController.getAll)

// GET /api/spaces/:id
// Récupère un espace spécifique
spacesRouter.get('/spaces/:id', SpaceController.getById)

// GET /api/spaces/:id/tree
// Récupère tout l'arbre hiérarchique
spacesRouter.get('/spaces/:id/tree', SpaceController.getTree)

// POST /api/spaces
// Crée un nouvel espace (avec validation)
spacesRouter.post(
  '/spaces',
  validate(createSpaceSchema),
  SpaceController.create
)

// PATCH /api/spaces/:id
// Modifie un espace existant (avec validation)
spacesRouter.patch(
  '/spaces/:id',
  validate(updateSpaceSchema),
  SpaceController.update
)

// DELETE /api/spaces/:id
// Supprime un espace et tous ses enfants
spacesRouter.delete('/spaces/:id', SpaceController.delete)

/**
 * 📖 EXEMPLES D'UTILISATION :
 *
 * 1️⃣ Créer un bâtiment (root) :
 *    POST /api/spaces
 *    Body: {
 *      "name": "Building A",
 *      "type": "building",
 *      "companyId": "uuid-company"
 *    }
 *    → path sera: "Building A"
 *
 * 2️⃣ Créer un étage dans le bâtiment :
 *    POST /api/spaces
 *    Body: {
 *      "name": "Floor 1",
 *      "type": "floor",
 *      "companyId": "uuid-company",
 *      "parentId": "building-a-uuid"
 *    }
 *    → path sera: "Building A/Floor 1"
 *
 * 3️⃣ Créer une salle dans l'étage :
 *    POST /api/spaces
 *    Body: {
 *      "name": "Room 101",
 *      "type": "room",
 *      "companyId": "uuid-company",
 *      "parentId": "floor-1-uuid"
 *    }
 *    → path sera: "Building A/Floor 1/Room 101"
 *
 * 4️⃣ Récupérer l'arbre complet d'un bâtiment :
 *    GET /api/spaces/building-a-uuid/tree
 *    Réponse :
 *    {
 *      "id": "...",
 *      "name": "Building A",
 *      "path": "Building A",
 *      "children": [
 *        {
 *          "id": "...",
 *          "name": "Floor 1",
 *          "path": "Building A/Floor 1",
 *          "children": [
 *            {
 *              "id": "...",
 *              "name": "Room 101",
 *              "path": "Building A/Floor 1/Room 101",
 *              "children": [],
 *              "sensors": [...]
 *            }
 *          ]
 *        }
 *      ]
 *    }
 *
 * 5️⃣ Récupérer uniquement les enfants directs d'un espace :
 *    GET /api/spaces?parentId=building-a-uuid
 */

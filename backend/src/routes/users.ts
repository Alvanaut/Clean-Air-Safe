import { Router } from 'express'
import { UserController } from '../controllers/userController.js'
import { validate, createUserSchema, updateUserSchema } from '../middleware/validators.js'

/**
 * 📖 USER ROUTES
 * Gère les utilisateurs avec leur hiérarchie
 *
 * Routes :
 * GET    /api/users              → Liste tous les utilisateurs
 * GET    /api/users/:id          → Un utilisateur spécifique
 * GET    /api/users/:id/hierarchy → Hiérarchie complète (managers + subordinates)
 * POST   /api/users              → Crée un nouvel utilisateur
 * PATCH  /api/users/:id          → Modifie un utilisateur
 * DELETE /api/users/:id          → Supprime un utilisateur
 */

export const usersRouter = Router()

// GET /api/users
// Liste tous les utilisateurs (avec filtres optionnels)
usersRouter.get('/users', UserController.getAll)

// GET /api/users/:id
// Récupère un utilisateur spécifique
usersRouter.get('/users/:id', UserController.getById)

// GET /api/users/:id/hierarchy
// Récupère toute la hiérarchie d'un utilisateur
usersRouter.get('/users/:id/hierarchy', UserController.getHierarchy)

// POST /api/users
// Crée un nouvel utilisateur (avec validation)
usersRouter.post(
  '/users',
  validate(createUserSchema),
  UserController.create
)

// PATCH /api/users/:id
// Modifie un utilisateur existant (avec validation)
usersRouter.patch(
  '/users/:id',
  validate(updateUserSchema),
  UserController.update
)

// DELETE /api/users/:id
// Supprime un utilisateur
usersRouter.delete('/users/:id', UserController.delete)

/**
 * 📖 EXEMPLES D'UTILISATION :
 *
 * 1️⃣ Récupérer tous les utilisateurs :
 *    GET /api/users
 *
 * 2️⃣ Récupérer les managers uniquement :
 *    GET /api/users?role=manager
 *
 * 3️⃣ Récupérer un utilisateur :
 *    GET /api/users/abc-123
 *
 * 4️⃣ Récupérer la hiérarchie d'un utilisateur :
 *    GET /api/users/abc-123/hierarchy
 *    Réponse :
 *    {
 *      "user": { "id": "...", "name": "John", "role": "manager" },
 *      "managers": [
 *        { "id": "...", "name": "CEO", "role": "admin" }
 *      ],
 *      "subordinates": [
 *        {
 *          "id": "...",
 *          "name": "Alice",
 *          "role": "user",
 *          "subordinates": []
 *        }
 *      ]
 *    }
 *
 * 5️⃣ Créer un utilisateur :
 *    POST /api/users
 *    Body: {
 *      "email": "user@example.com",
 *      "password": "securepass123",
 *      "name": "John Doe",
 *      "role": "user",
 *      "companyId": "uuid-company",
 *      "managerId": "uuid-manager"
 *    }
 *
 * 6️⃣ Changer le manager d'un utilisateur :
 *    PATCH /api/users/abc-123
 *    Body: {
 *      "managerId": "new-manager-uuid"
 *    }
 */

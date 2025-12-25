import type { Request, Response } from 'express'
import { prisma } from '../db/prisma.js'
import { logger } from '../utils/logger.js'
import bcrypt from 'bcrypt'

/**
 * 📖 USER CONTROLLER
 * Gère les utilisateurs avec leur hiérarchie (manager/subordinates)
 */

export class UserController {
  /**
   * GET /api/users
   * Liste tous les utilisateurs avec leur hiérarchie
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { companyId, role } = req.query

      const users = await prisma.user.findMany({
        where: {
          ...(companyId && { companyId: String(companyId) }),
          ...(role && { role: String(role) })
        },
        include: {
          company: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          subordinates: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          _count: {
            select: {
              subordinates: true,
              sensorsResponsible: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      logger.info(`📊 Fetched ${users.length} users`)

      return res.status(200).json({
        success: true,
        count: users.length,
        data: users
      })
    } catch (error) {
      logger.error('❌ Error fetching users:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch users'
      })
    }
  }

  /**
   * GET /api/users/:id
   * Récupère un utilisateur spécifique avec toute sa hiérarchie
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          company: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          subordinates: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          sensorsResponsible: {
            select: {
              id: true,
              name: true,
              deviceId: true,
              status: true
            }
          }
        }
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      logger.info(`✅ Fetched user ${id}`)

      return res.status(200).json({
        success: true,
        data: user
      })
    } catch (error) {
      logger.error('❌ Error fetching user:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch user'
      })
    }
  }

  /**
   * GET /api/users/:id/hierarchy
   * Récupère toute la hiérarchie d'un utilisateur (managers et subordinates récursifs)
   */
  static async getHierarchy(req: Request, res: Response) {
    try {
      const { id } = req.params

      const user = await prisma.user.findUnique({
        where: { id }
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Récupère tous les managers (remonte la hiérarchie)
      const managers = await UserController.getManagerChain(id)

      // Récupère tous les subordinates (descend la hiérarchie)
      const subordinates = await UserController.getSubordinatesTree(id)

      logger.info(`✅ Fetched hierarchy for user ${id}`)

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          managers,
          subordinates
        }
      })
    } catch (error) {
      logger.error('❌ Error fetching hierarchy:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch hierarchy'
      })
    }
  }

  /**
   * POST /api/users
   * Crée un nouvel utilisateur
   */
  static async create(req: Request, res: Response) {
    try {
      const { email, password, name, role, companyId, managerId, phone } = req.body

      // Vérifie si l'email existe déjà
      const existing = await prisma.user.findUnique({
        where: { email }
      })

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        })
      }

      // Hash le mot de passe
      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role,
          companyId,
          managerId,
          phone
        },
        include: {
          company: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      logger.info(`✅ Created user ${user.id} (${email})`)

      // Ne renvoie pas le mot de passe dans la réponse
      const { password: _, ...userWithoutPassword } = user

      return res.status(201).json({
        success: true,
        data: userWithoutPassword
      })
    } catch (error) {
      logger.error('❌ Error creating user:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create user'
      })
    }
  }

  /**
   * PATCH /api/users/:id
   * Modifie un utilisateur existant
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, role, managerId, phone, password } = req.body

      const existing = await prisma.user.findUnique({
        where: { id }
      })

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Si on change le mot de passe, le hasher
      const data: any = {
        ...(name && { name }),
        ...(role && { role }),
        ...(managerId !== undefined && { managerId }),
        ...(phone !== undefined && { phone })
      }

      if (password) {
        data.password = await bcrypt.hash(password, 10)
      }

      const user = await prisma.user.update({
        where: { id },
        data,
        include: {
          company: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      logger.info(`✅ Updated user ${id}`)

      const { password: _, ...userWithoutPassword } = user

      return res.status(200).json({
        success: true,
        data: userWithoutPassword
      })
    } catch (error) {
      logger.error('❌ Error updating user:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update user'
      })
    }
  }

  /**
   * DELETE /api/users/:id
   * Supprime un utilisateur
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

      const existing = await prisma.user.findUnique({
        where: { id }
      })

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      await prisma.user.delete({
        where: { id }
      })

      logger.info(`🗑️ Deleted user ${id}`)

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      })
    } catch (error) {
      logger.error('❌ Error deleting user:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      })
    }
  }

  // 🔧 HELPER : Récupère la chaîne des managers (récursif)
  private static async getManagerChain(userId: string): Promise<any[]> {
    const managers: any[] = []
    let currentUserId: string | null = userId

    while (currentUserId) {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      })

      if (user?.manager) {
        managers.push(user.manager)
        currentUserId = user.managerId
      } else {
        break
      }
    }

    return managers
  }

  // 🔧 HELPER : Récupère l'arbre des subordinates (récursif)
  private static async getSubordinatesTree(userId: string): Promise<any[]> {
    const subordinates = await prisma.user.findMany({
      where: { managerId: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    // Pour chaque subordinate, récupère ses propres subordinates
    const result = await Promise.all(
      subordinates.map(async (sub) => ({
        ...sub,
        subordinates: await UserController.getSubordinatesTree(sub.id)
      }))
    )

    return result
  }
}

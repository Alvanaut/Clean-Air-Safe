import type { Request, Response } from 'express'
import { prisma } from '../db/prisma.js'
import { logger } from '../utils/logger.js'

/**
 * 📖 SPACE CONTROLLER
 * Gère les espaces avec hiérarchie (materialized path pattern)
 *
 * Exemple de hiérarchie :
 * Building A                  (path: "Building A")
 *   └─ Floor 1                (path: "Building A/Floor 1")
 *       └─ Room 101           (path: "Building A/Floor 1/Room 101")
 */

export class SpaceController {
  /**
   * GET /api/spaces
   * Liste tous les espaces avec leur hiérarchie
   */
  static async getAll(req: Request, res: Response) {
    try {
      const { companyId, parentId } = req.query

      const spaces = await prisma.space.findMany({
        where: {
          ...(companyId && { companyId: String(companyId) }),
          ...(parentId && { parentId: String(parentId) })
        },
        include: {
          company: true,
          parent: {
            select: {
              id: true,
              name: true,
              path: true,
              level: true
            }
          },
          children: {
            select: {
              id: true,
              name: true,
              path: true,
              level: true
            }
          },
          _count: {
            select: {
              children: true,
              sensors: true
            }
          }
        },
        orderBy: {
          path: 'asc'
        }
      })

      logger.info(`📊 Fetched ${spaces.length} spaces`)

      return res.status(200).json({
        success: true,
        count: spaces.length,
        data: spaces
      })
    } catch (error) {
      logger.error('❌ Error fetching spaces:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch spaces'
      })
    }
  }

  /**
   * GET /api/spaces/:id
   * Récupère un espace spécifique avec ses enfants
   */
  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params

      const space = await prisma.space.findUnique({
        where: { id },
        include: {
          company: true,
          parent: {
            select: {
              id: true,
              name: true,
              path: true,
              level: true
            }
          },
          children: {
            select: {
              id: true,
              name: true,
              path: true,
              level: true
            }
          },
          sensors: {
            select: {
              id: true,
              name: true,
              deviceId: true,
              status: true
            }
          }
        }
      })

      if (!space) {
        return res.status(404).json({
          success: false,
          error: 'Space not found'
        })
      }

      logger.info(`✅ Fetched space ${id}`)

      return res.status(200).json({
        success: true,
        data: space
      })
    } catch (error) {
      logger.error('❌ Error fetching space:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch space'
      })
    }
  }

  /**
   * GET /api/spaces/:id/tree
   * Récupère tout l'arbre hiérarchique d'un espace
   */
  static async getTree(req: Request, res: Response) {
    try {
      const { id } = req.params

      const space = await prisma.space.findUnique({
        where: { id }
      })

      if (!space) {
        return res.status(404).json({
          success: false,
          error: 'Space not found'
        })
      }

      // Récupère tous les enfants (récursif via le path)
      const tree = await SpaceController.getChildrenTree(id)

      logger.info(`✅ Fetched tree for space ${id}`)

      return res.status(200).json({
        success: true,
        data: {
          ...space,
          children: tree
        }
      })
    } catch (error) {
      logger.error('❌ Error fetching space tree:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch space tree'
      })
    }
  }

  /**
   * POST /api/spaces
   * Crée un nouvel espace
   */
  static async create(req: Request, res: Response) {
    try {
      const { name, companyId, parentId } = req.body

      let path = name
      let level = 0

      // Si l'espace a un parent, construire le path
      if (parentId) {
        const parent = await prisma.space.findUnique({
          where: { id: parentId }
        })

        if (!parent) {
          return res.status(404).json({
            success: false,
            error: 'Parent space not found'
          })
        }

        path = `${parent.path}/${name}`
        level = parent.level + 1
      }

      const space = await prisma.space.create({
        data: {
          name,
          companyId,
          parentSpaceId: parentId,
          path,
          level
        },
        include: {
          company: true,
          parent: {
            select: {
              id: true,
              name: true,
              path: true,
              level: true
            }
          }
        }
      })

      logger.info(`✅ Created space ${space.id} (${name})`)

      return res.status(201).json({
        success: true,
        data: space
      })
    } catch (error) {
      logger.error('❌ Error creating space:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to create space'
      })
    }
  }

  /**
   * PATCH /api/spaces/:id
   * Modifie un espace existant
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name } = req.body

      const existing = await prisma.space.findUnique({
        where: { id }
      })

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Space not found'
        })
      }

      // Si on change le nom, mettre à jour le path (et tous les enfants)
      let data: any = {}

      if (name && name !== existing.name) {
        const newPath = existing.path.replace(
          new RegExp(`${existing.name}$`),
          name
        )

        data.name = name
        data.path = newPath

        // Mettre à jour tous les enfants
        const children = await prisma.space.findMany({
          where: {
            path: {
              startsWith: existing.path + '/'
            }
          }
        })

        await Promise.all(
          children.map((child) =>
            prisma.space.update({
              where: { id: child.id },
              data: {
                path: child.path.replace(existing.path, newPath)
              }
            })
          )
        )
      }

      const space = await prisma.space.update({
        where: { id },
        data,
        include: {
          company: true,
          parent: true
        }
      })

      logger.info(`✅ Updated space ${id}`)

      return res.status(200).json({
        success: true,
        data: space
      })
    } catch (error) {
      logger.error('❌ Error updating space:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update space'
      })
    }
  }

  /**
   * DELETE /api/spaces/:id
   * Supprime un espace (et tous ses enfants)
   */
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params

      const existing = await prisma.space.findUnique({
        where: { id }
      })

      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Space not found'
        })
      }

      // Supprimer tous les enfants
      await prisma.space.deleteMany({
        where: {
          path: {
            startsWith: existing.path + '/'
          }
        }
      })

      // Supprimer l'espace lui-même
      await prisma.space.delete({
        where: { id }
      })

      logger.info(`🗑️ Deleted space ${id} and all children`)

      return res.status(200).json({
        success: true,
        message: 'Space and all children deleted successfully'
      })
    } catch (error) {
      logger.error('❌ Error deleting space:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to delete space'
      })
    }
  }

  // 🔧 HELPER : Récupère l'arbre des enfants (récursif)
  private static async getChildrenTree(spaceId: string): Promise<any[]> {
    const children = await prisma.space.findMany({
      where: { parentId: spaceId },
      include: {
        sensors: {
          select: {
            id: true,
            name: true,
            deviceId: true,
            status: true
          }
        }
      }
    })

    const result = await Promise.all(
      children.map(async (child) => ({
        ...child,
        children: await SpaceController.getChildrenTree(child.id)
      }))
    )

    return result
  }
}

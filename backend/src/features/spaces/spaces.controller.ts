import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { SpacesService, CreateSpaceDto, UpdateSpaceDto } from './spaces.service';
import { SpaceType } from './space.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/user.entity';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  /**
   * Create a new space
   * POST /api/spaces
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post()
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async create(@Body() dto: CreateSpaceDto, @CurrentUser() currentUser: User) {
    // COMPANY_ADMIN can only create spaces in their own tenant
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (dto.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only create spaces within your own tenant');
      }
    }

    return await this.spacesService.create(dto);
  }

  /**
   * Get all spaces for a tenant
   * GET /api/spaces/tenant/:tenantId?type=BUILDING
   */
  @Get('tenant/:tenantId')
  async getByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() currentUser: User,
    @Query('type') type?: SpaceType,
  ) {
    // Check permissions
    if (currentUser.role !== UserRole.GODMODE) {
      // Non-GODMODE users MUST have a tenant_id
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }

      if (currentUser.tenant_id !== tenantId) {
        throw new ForbiddenException('You can only access spaces from your own tenant');
      }
    }

    return await this.spacesService.findByTenant(tenantId, type);
  }

  /**
   * Get buildings for a tenant (for dropdown selection)
   * GET /api/spaces/tenant/:tenantId/buildings
   */
  @Get('tenant/:tenantId/buildings')
  async getBuildingsByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() currentUser: User,
  ) {
    // Check permissions
    if (currentUser.role !== UserRole.GODMODE) {
      // Non-GODMODE users MUST have a tenant_id
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }

      if (currentUser.tenant_id !== tenantId) {
        throw new ForbiddenException('You can only access buildings from your own tenant');
      }
    }

    const buildings = await this.spacesService.getBuildingsByTenant(tenantId);

    // Format for dropdown: extract address from metadata
    return buildings.map((building) => ({
      id: building.id,
      name: building.name,
      address: building.metadata?.address || null,
      city: building.metadata?.city || null,
      postal_code: building.metadata?.postal_code || null,
      full_address: building.metadata?.address
        ? `${building.metadata.address}, ${building.metadata.postal_code || ''} ${building.metadata.city || ''}`.trim()
        : building.name,
    }));
  }

  /**
   * Get a single space by ID
   * GET /api/spaces/:id
   */
  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    const space = await this.spacesService.findOne(id);

    // Check permissions
    if (currentUser.role !== UserRole.GODMODE) {
      // Non-GODMODE users MUST have a tenant_id
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }

      if (space.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only access spaces from your own tenant');
      }
    }

    return space;
  }

  /**
   * Update a space
   * PUT /api/spaces/:id
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Put(':id')
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async update(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @Body() dto: UpdateSpaceDto,
  ) {
    const space = await this.spacesService.findOne(id);

    // Check permissions
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (space.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only update spaces from your own tenant');
      }
    }

    return await this.spacesService.update(id, dto);
  }

  /**
   * Delete a space
   * DELETE /api/spaces/:id
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Delete(':id')
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    const space = await this.spacesService.findOne(id);

    // Check permissions
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (space.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only delete spaces from your own tenant');
      }
    }

    await this.spacesService.remove(id);
    return { message: 'Space deleted successfully' };
  }

  /**
   * Get child spaces
   * GET /api/spaces/:id/children
   */
  @Get(':id/children')
  async getChildren(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    const parentSpace = await this.spacesService.findOne(id);

    // Check permissions
    if (currentUser.role !== UserRole.GODMODE) {
      // Non-GODMODE users MUST have a tenant_id
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }

      if (parentSpace.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only access spaces from your own tenant');
      }
    }

    return await this.spacesService.getChildren(id);
  }
}

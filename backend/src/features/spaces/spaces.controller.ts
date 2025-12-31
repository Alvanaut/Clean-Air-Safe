import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { SpacesService, CreateSpaceDto, UpdateSpaceDto } from './spaces.service';
import { SpaceType } from './space.entity';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  /**
   * Create a new space
   * POST /api/spaces
   */
  @Post()
  async create(@Body() dto: CreateSpaceDto) {
    return await this.spacesService.create(dto);
  }

  /**
   * Get all spaces for a tenant
   * GET /api/spaces/tenant/:tenantId?type=BUILDING
   */
  @Get('tenant/:tenantId')
  async getByTenant(
    @Param('tenantId') tenantId: string,
    @Query('type') type?: SpaceType,
  ) {
    return await this.spacesService.findByTenant(tenantId, type);
  }

  /**
   * Get buildings for a tenant (for dropdown selection)
   * GET /api/spaces/tenant/:tenantId/buildings
   */
  @Get('tenant/:tenantId/buildings')
  async getBuildingsByTenant(@Param('tenantId') tenantId: string) {
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
  async getOne(@Param('id') id: string) {
    return await this.spacesService.findOne(id);
  }

  /**
   * Update a space
   * PUT /api/spaces/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSpaceDto) {
    return await this.spacesService.update(id, dto);
  }

  /**
   * Delete a space
   * DELETE /api/spaces/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.spacesService.remove(id);
    return { message: 'Space deleted successfully' };
  }

  /**
   * Get child spaces
   * GET /api/spaces/:id/children
   */
  @Get(':id/children')
  async getChildren(@Param('id') id: string) {
    return await this.spacesService.getChildren(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

/**
 * Tenants Controller
 * All endpoints require GODMODE role
 * Multi-tenant management is restricted to super admins only
 */
@Controller('tenants')
@Roles(UserRole.GODMODE)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Create a new tenant
   * POST /api/tenants
   */
  @Post()
  async create(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser() user: User,
  ) {
    const tenant = await this.tenantsService.create(createTenantDto);
    return {
      success: true,
      message: 'Tenant created successfully',
      data: tenant,
      created_by: {
        user_id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Get all tenants
   * GET /api/tenants
   */
  @Get()
  async findAll() {
    const tenants = await this.tenantsService.findAll();
    return {
      success: true,
      count: tenants.length,
      data: tenants,
    };
  }

  /**
   * Get one tenant by ID
   * GET /api/tenants/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tenant = await this.tenantsService.findOne(id);
    return {
      success: true,
      data: tenant,
    };
  }

  /**
   * Get tenant statistics
   * GET /api/tenants/:id/stats
   */
  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    const stats = await this.tenantsService.getStats(id);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Update a tenant
   * PUT /api/tenants/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @CurrentUser() user: User,
  ) {
    const tenant = await this.tenantsService.update(id, updateTenantDto);
    return {
      success: true,
      message: 'Tenant updated successfully',
      data: tenant,
      updated_by: {
        user_id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Suspend a tenant
   * POST /api/tenants/:id/suspend
   */
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(@Param('id') id: string, @CurrentUser() user: User) {
    const tenant = await this.tenantsService.suspend(id);
    return {
      success: true,
      message: 'Tenant suspended successfully',
      data: tenant,
      suspended_by: {
        user_id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Activate a tenant
   * POST /api/tenants/:id/activate
   */
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string, @CurrentUser() user: User) {
    const tenant = await this.tenantsService.activate(id);
    return {
      success: true,
      message: 'Tenant activated successfully',
      data: tenant,
      activated_by: {
        user_id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Delete a tenant
   * DELETE /api/tenants/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.tenantsService.remove(id);
    return {
      success: true,
      message: 'Tenant deleted successfully',
      deleted_by: {
        user_id: user.id,
        email: user.email,
      },
    };
  }
}

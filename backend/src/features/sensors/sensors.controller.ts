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
  Query,
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { GetReadingsDto } from './dto/get-readings.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/user.entity';
import { Roles } from '../../auth/decorators/roles.decorator';

/**
 * Sensors Controller
 * Handles sensor management with role-based access control
 */
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  /**
   * Create a new sensor
   * POST /api/sensors
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post()
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async create(
    @Body() createSensorDto: CreateSensorDto,
    @CurrentUser() currentUser: User,
  ) {
    const sensor = await this.sensorsService.create(
      createSensorDto,
      currentUser,
    );

    return {
      success: true,
      message: 'Sensor created successfully',
      data: sensor,
      created_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }

  /**
   * Get all sensors (filtered by role)
   * GET /api/sensors
   */
  @Get()
  async findAll(@CurrentUser() currentUser: User) {
    const sensors = await this.sensorsService.findAll(currentUser);

    return {
      success: true,
      count: sensors.length,
      data: sensors,
    };
  }

  /**
   * Get sensors by tenant
   * GET /api/sensors/tenant/:tenantId
   */
  @Get('tenant/:tenantId')
  async findByTenant(
    @Param('tenantId') tenantId: string,
    @CurrentUser() currentUser: User,
  ) {
    const sensors = await this.sensorsService.findByTenant(
      tenantId,
      currentUser,
    );

    return {
      success: true,
      count: sensors.length,
      data: sensors,
    };
  }

  /**
   * Get sensors by space
   * GET /api/sensors/space/:spaceId
   */
  @Get('space/:spaceId')
  async findBySpace(
    @Param('spaceId') spaceId: string,
    @CurrentUser() currentUser: User,
  ) {
    const sensors = await this.sensorsService.findBySpace(
      spaceId,
      currentUser,
    );

    return {
      success: true,
      count: sensors.length,
      data: sensors,
    };
  }

  /**
   * Get sensor by QR code
   * GET /api/sensors/qr/:qrCode
   */
  @Get('qr/:qrCode')
  async findByQrCode(@Param('qrCode') qrCode: string) {
    const sensor = await this.sensorsService.findByQrCode(qrCode);

    if (!sensor) {
      return {
        success: false,
        message: 'Sensor not found',
      };
    }

    return {
      success: true,
      data: sensor,
    };
  }

  /**
   * Get sensor readings
   * GET /api/sensors/:id/readings
   */
  @Get(':id/readings')
  async getReadings(
    @Param('id') id: string,
    @Query() query: GetReadingsDto,
    @CurrentUser() currentUser: User,
  ) {
    const result = await this.sensorsService.getReadings(id, query, currentUser);

    return {
      success: true,
      data: result.readings,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      sensor: result.sensor,
    };
  }

  /**
   * Get one sensor by ID
   * GET /api/sensors/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const sensor = await this.sensorsService.findOne(id, currentUser);

    return {
      success: true,
      data: sensor,
    };
  }

  /**
   * Get sensor statistics
   * GET /api/sensors/:id/stats
   */
  @Get(':id/stats')
  async getStats(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const stats = await this.sensorsService.getStats(id, currentUser);

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Update a sensor
   * PUT /api/sensors/:id
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Put(':id')
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateSensorDto: UpdateSensorDto,
    @CurrentUser() currentUser: User,
  ) {
    const sensor = await this.sensorsService.update(
      id,
      updateSensorDto,
      currentUser,
    );

    return {
      success: true,
      message: 'Sensor updated successfully',
      data: sensor,
      updated_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }

  /**
   * Set sensor to maintenance mode
   * POST /api/sensors/:id/maintenance
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post(':id/maintenance')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async setMaintenance(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ) {
    const sensor = await this.sensorsService.setMaintenance(id, currentUser);

    return {
      success: true,
      message: 'Sensor set to maintenance mode',
      data: sensor,
    };
  }

  /**
   * Activate sensor
   * POST /api/sensors/:id/activate
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async activate(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const sensor = await this.sensorsService.activate(id, currentUser);

    return {
      success: true,
      message: 'Sensor activated successfully',
      data: sensor,
    };
  }

  /**
   * Deactivate sensor
   * POST /api/sensors/:id/deactivate
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async deactivate(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const sensor = await this.sensorsService.deactivate(id, currentUser);

    return {
      success: true,
      message: 'Sensor deactivated successfully',
      data: sensor,
    };
  }

  /**
   * Assign sensor to user
   * POST /api/sensors/:id/assign-user
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post(':id/assign-user')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async assignToUser(
    @Param('id') id: string,
    @Body('user_id') userId: string,
    @CurrentUser() currentUser: User,
  ) {
    const sensor = await this.sensorsService.assignToUser(
      id,
      userId,
      currentUser,
    );

    return {
      success: true,
      message: 'Sensor assigned to user successfully',
      data: sensor,
    };
  }

  /**
   * Assign sensor to space
   * POST /api/sensors/:id/assign-space
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post(':id/assign-space')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async assignToSpace(
    @Param('id') id: string,
    @Body('space_id') spaceId: string,
    @CurrentUser() currentUser: User,
  ) {
    const sensor = await this.sensorsService.assignToSpace(
      id,
      spaceId,
      currentUser,
    );

    return {
      success: true,
      message: 'Sensor assigned to space successfully',
      data: sensor,
    };
  }

  /**
   * Delete a sensor
   * DELETE /api/sensors/:id
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    await this.sensorsService.remove(id, currentUser);

    return {
      success: true,
      message: 'Sensor deleted successfully',
      deleted_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }
}

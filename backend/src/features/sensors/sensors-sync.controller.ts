import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { KspSyncService } from './ksp-sync.service';
import { Public } from '../../auth/decorators/public.decorator';

@Public()
@Controller('sensors/sync')
export class SensorsSyncController {
  constructor(private readonly kspSyncService: KspSyncService) {}

  /**
   * Get sync status
   * GET /api/sensors/sync/status
   */
  @Get('status')
  getSyncStatus() {
    return this.kspSyncService.getSyncStatus();
  }

  /**
   * Manually trigger sync (for testing)
   * POST /api/sensors/sync/now
   */
  @Post('now')
  @HttpCode(HttpStatus.OK)
  async triggerSync() {
    try {
      await this.kspSyncService.syncNow();
      return {
        success: true,
        message: 'Sync completed successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Sync failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Sync historical data for a specific sensor
   * POST /api/sensors/sync/:sensorId/history?daysBack=30
   */
  @Post(':sensorId/history')
  @HttpCode(HttpStatus.OK)
  async syncSensorHistory(
    @Param('sensorId') sensorId: string,
    @Query('daysBack', new DefaultValuePipe(30), ParseIntPipe)
    daysBack: number,
  ) {
    try {
      const result = await this.kspSyncService.syncSensorHistory(
        sensorId,
        daysBack,
      );
      return {
        ...result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        readingsImported: 0,
        message: 'Historical sync failed',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

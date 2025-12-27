import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
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
}

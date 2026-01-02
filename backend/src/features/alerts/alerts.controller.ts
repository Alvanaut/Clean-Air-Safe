import { Controller, Get, Param, Query } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/user.entity';
import { GetAlertsDto } from './dto/get-alerts.dto';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  /**
   * Get all alerts for current user
   * GET /api/alerts?status=active&limit=50&offset=0
   */
  @Get()
  async findAll(@CurrentUser() currentUser: User, @Query() query: GetAlertsDto) {
    const alerts = await this.alertsService.findAll(currentUser, query);
    return {
      success: true,
      data: alerts,
      count: alerts.length,
    };
  }

  /**
   * Get alert statistics summary
   * GET /api/alerts/stats/summary
   */
  @Get('stats/summary')
  async getStats(@CurrentUser() currentUser: User) {
    const stats = await this.alertsService.getStats(currentUser);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get a single alert by ID
   * GET /api/alerts/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const alert = await this.alertsService.findOne(id, currentUser);
    return {
      success: true,
      data: alert,
    };
  }

  /**
   * NOTE: Alerts cannot be manually acknowledged or resolved.
   * They are automatically resolved when CO2 returns below threshold.
   * If CO2 stays elevated, they automatically escalate to n+1 after the configured delay.
   */
}

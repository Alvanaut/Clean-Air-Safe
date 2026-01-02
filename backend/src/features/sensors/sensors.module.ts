import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleRef } from '@nestjs/core';
import { Sensor } from './sensor.entity';
import { SensorReading } from '../readings/sensor-reading.entity';
import { Tenant } from '../../tenants/tenant.entity';
import { KspSyncService } from './ksp-sync.service';
import { SensorsSyncController } from './sensors-sync.controller';
import { SensorsReadingsController } from './sensors-readings.controller';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';
import { WebsocketModule } from '../../websocket/websocket.module';
import { AlertsModule } from '../alerts/alerts.module';
import { AlertsService } from '../alerts/alerts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor, SensorReading, Tenant]),
    WebsocketModule,
    forwardRef(() => AlertsModule),
  ],
  controllers: [SensorsSyncController, SensorsController, SensorsReadingsController],
  providers: [KspSyncService, SensorsService],
  exports: [KspSyncService, SensorsService],
})
export class SensorsModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly kspSyncService: KspSyncService,
  ) {}

  async onModuleInit() {
    // Inject AlertsService into KspSyncService to avoid circular dependency
    try {
      const alertsService = this.moduleRef.get(AlertsService, { strict: false });
      if (alertsService) {
        this.kspSyncService.setAlertsService(alertsService);
      }
    } catch (error) {
      console.warn('AlertsService not available yet, alert processing disabled');
    }
  }
}

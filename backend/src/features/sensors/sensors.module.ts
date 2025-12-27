import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sensor } from './sensor.entity';
import { SensorReading } from '../readings/sensor-reading.entity';
import { Tenant } from '../../tenants/tenant.entity';
import { KspSyncService } from './ksp-sync.service';
import { SensorsSyncController } from './sensors-sync.controller';
import { SensorsReadingsController } from './sensors-readings.controller';
import { SensorsService } from './sensors.service';
import { SensorsController } from './sensors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sensor, SensorReading, Tenant])],
  controllers: [SensorsSyncController, SensorsController, SensorsReadingsController],
  providers: [KspSyncService, SensorsService],
  exports: [KspSyncService, SensorsService],
})
export class SensorsModule {}

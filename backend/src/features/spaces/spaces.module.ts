import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from './space.entity';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { BaselineService } from './baseline.service';
import { SensorReading } from '../readings/sensor-reading.entity';
import { Sensor } from '../sensors/sensor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Space, SensorReading, Sensor])],
  controllers: [SpacesController],
  providers: [SpacesService, BaselineService],
  exports: [SpacesService, BaselineService],
})
export class SpacesModule {}

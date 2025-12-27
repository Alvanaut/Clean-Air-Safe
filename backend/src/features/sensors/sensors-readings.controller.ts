import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensorReading } from '../readings/sensor-reading.entity';
import { Sensor } from './sensor.entity';
import { GetReadingsDto } from './dto/get-readings.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../users/user.entity';

@Controller('sensors/:sensorId/readings')
export class SensorsReadingsController {
  constructor(
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
    @InjectRepository(SensorReading)
    private readingRepository: Repository<SensorReading>,
  ) {}

  /**
   * Get sensor readings with time filters
   * GET /api/sensors/:sensorId/readings
   */
  @Get()
  async getReadings(
    @Param('sensorId') sensorId: string,
    @Query() query: GetReadingsDto,
    @CurrentUser() currentUser: User,
  ) {
    // Check sensor exists and user has access
    const sensor = await this.sensorRepository.findOne({
      where: { id: sensorId },
    });

    if (!sensor) {
      return {
        success: false,
        message: 'Sensor not found',
      };
    }

    // Check access permissions
    if (currentUser.role !== UserRole.GODMODE) {
      if (
        currentUser.role === UserRole.COMPANY_ADMIN ||
        currentUser.role === UserRole.MANAGER
      ) {
        if (sensor.tenant_id !== currentUser.tenant_id) {
          return {
            success: false,
            message: 'Access denied',
          };
        }
      } else if (sensor.responsible_user_id !== currentUser.id) {
        return {
          success: false,
          message: 'Access denied',
        };
      }
    }

    const { start_date, end_date, limit = 100, offset = 0 } = query;

    const queryBuilder = this.readingRepository
      .createQueryBuilder('reading')
      .where('reading.sensor_id = :sensorId', { sensorId })
      .orderBy('reading.timestamp', 'DESC')
      .take(limit)
      .skip(offset);

    if (start_date) {
      queryBuilder.andWhere('reading.timestamp >= :start_date', { start_date });
    }

    if (end_date) {
      queryBuilder.andWhere('reading.timestamp <= :end_date', { end_date });
    }

    const [readings, total] = await queryBuilder.getManyAndCount();

    return {
      success: true,
      data: readings,
      total,
      limit,
      offset,
      sensor: {
        id: sensor.id,
        name: sensor.name,
        ksp_device_id: sensor.ksp_device_id,
      },
    };
  }
}

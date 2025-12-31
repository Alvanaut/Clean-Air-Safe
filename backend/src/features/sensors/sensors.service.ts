import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor, SensorStatus } from './sensor.entity';
import { SensorReading } from '../readings/sensor-reading.entity';
import { User, UserRole } from '../../users/user.entity';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { GetReadingsDto } from './dto/get-readings.dto';

@Injectable()
export class SensorsService {
  constructor(
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
    @InjectRepository(SensorReading)
    private readingRepository: Repository<SensorReading>,
  ) {}

  async create(createSensorDto: CreateSensorDto, currentUser: User): Promise<Sensor> {
    // Check permissions
    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to create sensors');
    }

    // COMPANY_ADMIN can only create sensors in their own tenant
    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (createSensorDto.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only create sensors within your own tenant');
      }
    }

    const sensor = this.sensorRepository.create({
      ...createSensorDto,
      status: SensorStatus.INACTIVE,
      qr_code: `SENSOR_${createSensorDto.ksp_device_id}`,
    });

    return await this.sensorRepository.save(sensor);
  }

  async findAll(currentUser: User): Promise<Sensor[]> {
    const queryBuilder = this.sensorRepository.createQueryBuilder('sensor');

    // Apply role-based filtering
    if (currentUser.role === UserRole.GODMODE) {
      // GODMODE sees all sensors
    } else if (currentUser.role === UserRole.COMPANY_ADMIN || currentUser.role === UserRole.MANAGER) {
      // Company admin and managers must have a tenant_id
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }

      // Company admin and managers see all sensors in their tenant
      queryBuilder.where('sensor.tenant_id = :tenantId', { tenantId: currentUser.tenant_id });
    } else {
      // Regular users only see sensors assigned to them
      queryBuilder.where('sensor.responsible_user_id = :userId', { userId: currentUser.id });
    }

    return await queryBuilder.getMany();
  }

  async findByTenant(tenantId: string, currentUser: User): Promise<Sensor[]> {
    // Check permissions
    if (currentUser.role !== UserRole.GODMODE) {
      // Non-GODMODE users must have a tenant_id
      if (!currentUser.tenant_id) {
        throw new ForbiddenException('User is not associated with any tenant');
      }

      if (currentUser.tenant_id !== tenantId) {
        throw new ForbiddenException('Access denied');
      }
    }

    return await this.sensorRepository.find({
      where: { tenant_id: tenantId },
    });
  }

  async findBySpace(spaceId: string, currentUser: User): Promise<Sensor[]> {
    const sensors = await this.sensorRepository.find({
      where: { space_id: spaceId },
    });

    // Filter based on user permissions
    if (currentUser.role === UserRole.GODMODE) {
      return sensors;
    } else if (currentUser.role === UserRole.COMPANY_ADMIN || currentUser.role === UserRole.MANAGER) {
      return sensors.filter(s => s.tenant_id === currentUser.tenant_id);
    } else {
      return sensors.filter(s => s.responsible_user_id === currentUser.id);
    }
  }

  async findByQrCode(qrCode: string): Promise<Sensor | null> {
    return await this.sensorRepository.findOne({
      where: { qr_code: qrCode },
    });
  }

  async findOne(id: string, currentUser: User): Promise<Sensor> {
    const sensor = await this.sensorRepository.findOne({
      where: { id },
      relations: ['space'],
    });

    if (!sensor) {
      throw new NotFoundException('Sensor not found');
    }

    // Check permissions
    if (currentUser.role !== UserRole.GODMODE) {
      if (currentUser.role === UserRole.COMPANY_ADMIN || currentUser.role === UserRole.MANAGER) {
        if (sensor.tenant_id !== currentUser.tenant_id) {
          throw new ForbiddenException('Access denied');
        }
      } else if (sensor.responsible_user_id !== currentUser.id) {
        throw new ForbiddenException('Access denied');
      }
    }

    return sensor;
  }

  async getReadings(id: string, query: GetReadingsDto, currentUser: User) {
    const sensor = await this.findOne(id, currentUser);

    const { start_date, end_date, limit = 100, offset = 0 } = query;

    const queryBuilder = this.readingRepository
      .createQueryBuilder('reading')
      .where('reading.sensor_id = :sensorId', { sensorId: id })
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
      readings,
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

  async getStats(id: string, currentUser: User) {
    const sensor = await this.findOne(id, currentUser);

    // Get last 24 hours of readings
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const readings = await this.readingRepository
      .createQueryBuilder('reading')
      .where('reading.sensor_id = :sensorId', { sensorId: id })
      .andWhere('reading.timestamp >= :oneDayAgo', { oneDayAgo })
      .getMany();

    if (readings.length === 0) {
      return {
        sensor_id: sensor.id,
        sensor_name: sensor.name,
        total_readings: 0,
        last_24h: 0,
      };
    }

    const co2Values = readings.map(r => r.co2_level);
    const avgCO2 = Math.round(co2Values.reduce((a, b) => a + b, 0) / co2Values.length);
    const minCO2 = Math.min(...co2Values);
    const maxCO2 = Math.max(...co2Values);

    return {
      sensor_id: sensor.id,
      sensor_name: sensor.name,
      total_readings: readings.length,
      last_24h: readings.length,
      avg_co2: avgCO2,
      min_co2: minCO2,
      max_co2: maxCO2,
    };
  }

  async update(id: string, updateSensorDto: UpdateSensorDto, currentUser: User): Promise<Sensor> {
    const sensor = await this.findOne(id, currentUser);

    // Check permissions for updates
    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to update sensors');
    }

    Object.assign(sensor, updateSensorDto);
    return await this.sensorRepository.save(sensor);
  }

  async setMaintenance(id: string, currentUser: User): Promise<Sensor> {
    const sensor = await this.findOne(id, currentUser);

    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to set maintenance mode');
    }

    sensor.status = SensorStatus.MAINTENANCE;
    return await this.sensorRepository.save(sensor);
  }

  async activate(id: string, currentUser: User): Promise<Sensor> {
    const sensor = await this.findOne(id, currentUser);

    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to activate sensors');
    }

    sensor.status = SensorStatus.ACTIVE;
    return await this.sensorRepository.save(sensor);
  }

  async deactivate(id: string, currentUser: User): Promise<Sensor> {
    const sensor = await this.findOne(id, currentUser);

    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to deactivate sensors');
    }

    sensor.status = SensorStatus.INACTIVE;
    return await this.sensorRepository.save(sensor);
  }

  async assignToUser(id: string, userId: string, currentUser: User): Promise<Sensor> {
    const sensor = await this.findOne(id, currentUser);

    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to assign sensors');
    }

    sensor.responsible_user_id = userId;
    return await this.sensorRepository.save(sensor);
  }

  async assignToSpace(id: string, spaceId: string, currentUser: User): Promise<Sensor> {
    const sensor = await this.findOne(id, currentUser);

    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to assign sensors to spaces');
    }

    sensor.space_id = spaceId;
    return await this.sensorRepository.save(sensor);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const sensor = await this.findOne(id, currentUser);

    if (currentUser.role !== UserRole.GODMODE && currentUser.role !== UserRole.COMPANY_ADMIN) {
      throw new ForbiddenException('You do not have permission to delete sensors');
    }

    await this.sensorRepository.remove(sensor);
  }
}

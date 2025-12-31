import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Space } from './space.entity';
import { SensorReading } from '../readings/sensor-reading.entity';
import { Sensor } from '../sensors/sensor.entity';

@Injectable()
export class BaselineService {
  private readonly logger = new Logger(BaselineService.name);
  private readonly DEFAULT_BASELINE = 400; // Default CO2 baseline in ppm
  private readonly MIN_BASELINE = 380; // Outdoor minimum
  private readonly DAYS_OF_DATA = 7; // Use 7 days of data minimum

  constructor(
    @InjectRepository(Space)
    private readonly spaceRepository: Repository<Space>,
    @InjectRepository(SensorReading)
    private readonly readingRepository: Repository<SensorReading>,
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
  ) {}

  /**
   * Calculate baseline for a specific space using 5th percentile of CO2 readings
   * over the past 7-14 days
   */
  async calculateBaseline(spaceId: string): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - this.DAYS_OF_DATA);

    // Get all sensors in this space
    const sensors = await this.sensorRepository.find({
      where: { space_id: spaceId },
    });

    if (sensors.length === 0) {
      this.logger.warn(
        `No sensors found for space ${spaceId}, using default baseline`,
      );
      return this.DEFAULT_BASELINE;
    }

    const sensorIds = sensors.map((s) => s.id);

    // Get all CO2 readings for these sensors in the past 7 days
    const readings = await this.readingRepository
      .createQueryBuilder('reading')
      .select('reading.co2_level')
      .where('reading.sensor_id IN (:...sensorIds)', { sensorIds })
      .andWhere('reading.timestamp >= :since', { since })
      .andWhere('reading.co2_level > :minCO2', { minCO2: this.MIN_BASELINE })
      .getMany();

    if (readings.length < 100) {
      this.logger.warn(
        `Not enough readings for space ${spaceId} (${readings.length}), using default baseline`,
      );
      return this.DEFAULT_BASELINE;
    }

    // Extract CO2 levels and sort
    const co2Levels = readings.map((r) => r.co2_level).sort((a, b) => a - b);

    // Calculate 5th percentile
    const percentileIndex = Math.floor(co2Levels.length * 0.05);
    const baseline = co2Levels[percentileIndex];

    // Ensure baseline is never below outdoor minimum
    const finalBaseline = Math.max(baseline, this.MIN_BASELINE);

    this.logger.log(
      `Calculated baseline for space ${spaceId}: ${finalBaseline} ppm (from ${readings.length} readings)`,
    );

    return Math.round(finalBaseline);
  }

  /**
   * Update baseline for a specific space
   */
  async updateSpaceBaseline(spaceId: string): Promise<Space> {
    const space = await this.spaceRepository.findOne({
      where: { id: spaceId },
    });

    if (!space) {
      throw new Error(`Space ${spaceId} not found`);
    }

    const newBaseline = await this.calculateBaseline(spaceId);
    space.co2_baseline = newBaseline;

    return await this.spaceRepository.save(space);
  }

  /**
   * Update baselines for all spaces in a tenant
   * This will be called by the weekly cron job
   */
  async updateAllBaselines(tenantId?: string): Promise<number> {
    let spaces: Space[];

    if (tenantId) {
      spaces = await this.spaceRepository.find({
        where: { tenant_id: tenantId },
      });
    } else {
      spaces = await this.spaceRepository.find();
    }

    let updatedCount = 0;

    for (const space of spaces) {
      try {
        const newBaseline = await this.calculateBaseline(space.id);
        space.co2_baseline = newBaseline;
        await this.spaceRepository.save(space);
        updatedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to update baseline for space ${space.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Updated baselines for ${updatedCount}/${spaces.length} spaces`,
    );

    return updatedCount;
  }

  /**
   * Get CO2 status based on baseline and current level
   */
  getCO2Status(
    co2Level: number,
    baseline: number,
  ): { color: 'green' | 'orange' | 'red'; label: string; threshold: string } {
    const greenThreshold = baseline + 500;
    const orangeThreshold = baseline + 700;

    if (co2Level <= greenThreshold) {
      return {
        color: 'green',
        label: 'Bon',
        threshold: `≤ ${greenThreshold} ppm`,
      };
    } else if (co2Level <= orangeThreshold) {
      return {
        color: 'orange',
        label: 'Moyen',
        threshold: `${greenThreshold} - ${orangeThreshold} ppm`,
      };
    } else {
      return {
        color: 'red',
        label: 'Mauvais',
        threshold: `> ${orangeThreshold} ppm`,
      };
    }
  }

  /**
   * Cron job - Runs every Sunday at 3:00 AM
   * Format: second minute hour day month dayOfWeek (0 = Sunday)
   */
  @Cron('0 0 3 * * 0')
  async handleWeeklyCron() {
    this.logger.log('Starting weekly baseline update...');

    try {
      const updatedCount = await this.updateAllBaselines();
      this.logger.log(
        `Weekly baseline update completed: ${updatedCount} spaces updated`,
      );
    } catch (error) {
      this.logger.error('Weekly baseline update failed', error.stack);
    }
  }
}

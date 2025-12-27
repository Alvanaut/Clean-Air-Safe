import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sensor } from '../sensors/sensor.entity';

export enum ReadingSource {
  LOCAL = 1, // From device (KSP source=1)
  REMOTE = 2, // From platform (KSP source=2)
}

@Entity('sensor_readings')
@Index(['sensor_id', 'timestamp'])
@Index(['timestamp'])
export class SensorReading {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  // Sensor
  @ManyToOne(() => Sensor, (sensor) => sensor.readings)
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensor;

  @Column({ type: 'uuid' })
  sensor_id: string;

  // Readings
  @Column({ type: 'int' })
  co2_level: number; // ppm

  @Column({ type: 'float', nullable: true })
  temperature: number | null; // °C

  @Column({ type: 'float', nullable: true })
  humidity: number | null; // %

  // Timestamp (from KSP, converted to Date)
  @Column({ type: 'timestamp' })
  timestamp: Date;

  // Source (1=local device, 2=remote platform)
  @Column({
    type: 'int',
    default: ReadingSource.REMOTE,
  })
  source: ReadingSource;

  // When inserted in our DB
  @CreateDateColumn()
  created_at: Date;

  // Optional: Pre-aggregated flag
  @Column({ type: 'boolean', default: false })
  is_aggregated: boolean;
}

// Note: TimescaleDB hypertable will be created via migration
// SELECT create_hypertable('sensor_readings', 'timestamp');

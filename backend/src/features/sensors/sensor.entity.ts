import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { Space } from '../spaces/space.entity';
import { User } from '../../users/user.entity';
import { SensorReading } from '../readings/sensor-reading.entity';
import { Alert } from '../alerts/alert.entity';

export enum SensorStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

@Entity('sensors')
@Index(['tenant_id'])
@Index(['ksp_device_id'])
@Index(['qr_code'], { unique: true })
export class Sensor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // KSP Integration
  @Column({ type: 'varchar', unique: true })
  ksp_device_id: string; // ID from KSP API

  @Column({ type: 'varchar', nullable: true })
  ksp_serial_number: string; // DT_serial_number from KSP

  @Column({ type: 'varchar', nullable: true })
  ksp_timezone: string;

  // Our QR Code (custom, not from KSP)
  @Column({ type: 'uuid', unique: true })
  qr_code: string;

  // Last reading (denormalized for performance)
  @Column({ type: 'int', nullable: true })
  last_reading_co2: number | null;

  @Column({ type: 'float', nullable: true })
  last_reading_temperature: number | null;

  @Column({ type: 'float', nullable: true })
  last_reading_humidity: number | null;

  @Column({ type: 'timestamp', nullable: true })
  last_reading_at: Date | null;

  // Status
  @Column({
    type: 'enum',
    enum: SensorStatus,
    default: SensorStatus.ACTIVE,
  })
  status: SensorStatus;

  @Column({
    type: 'enum',
    enum: SensorStatus,
    default: SensorStatus.ACTIVE,
  })
  sync_status: SensorStatus;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_at: Date | null;

  @Column({ type: 'text', nullable: true })
  sync_error: string | null;

  // Location
  @ManyToOne(() => Space, (space) => space.sensors, { nullable: true })
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  // Responsible user
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsible_user: User;

  @Column({ type: 'uuid', nullable: true })
  responsible_user_id: string;

  // Tenant
  @ManyToOne(() => Tenant, (tenant) => tenant.sensors)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid' })
  tenant_id: string;

  // Relations
  @OneToMany(() => SensorReading, (reading) => reading.sensor)
  readings: SensorReading[];

  @OneToMany(() => Alert, (alert) => alert.sensor)
  alerts: Alert[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

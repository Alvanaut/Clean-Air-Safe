import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { Space } from '../spaces/space.entity';
import { Sensor } from '../sensors/sensor.entity';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
}

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Scope (tenant > space > sensor hierarchy)
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid' })
  tenant_id: string;

  // Optional: specific to a space (null = applies to all)
  @ManyToOne(() => Space, { nullable: true })
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  // Optional: specific to a sensor (null = applies to all)
  @ManyToOne(() => Sensor, { nullable: true })
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensor;

  @Column({ type: 'uuid', nullable: true })
  sensor_id: string;

  // Threshold & Timing
  @Column({ type: 'int' })
  threshold_co2: number; // ppm

  @Column({ type: 'int', default: 5 })
  escalation_delay_minutes: number;

  @Column({ type: 'int', default: 3 })
  max_escalation_level: number;

  // Notification
  @Column({
    type: 'enum',
    enum: NotificationChannel,
    array: true,
    default: [NotificationChannel.EMAIL],
  })
  notification_channels: NotificationChannel[];

  // Active status
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  // Priority (higher = more important)
  @Column({ type: 'int', default: 1 })
  priority: number;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

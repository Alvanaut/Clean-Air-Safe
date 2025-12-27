import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Sensor } from '../sensors/sensor.entity';
import { Space } from '../spaces/space.entity';
import { Tenant } from '../../tenants/tenant.entity';

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export enum AlertSeverity {
  WARNING = 'warning',
  CRITICAL = 'critical',
}

@Entity('alerts')
@Index(['sensor_id', 'status'])
@Index(['status', 'created_at'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Sensor
  @ManyToOne(() => Sensor, (sensor) => sensor.alerts)
  @JoinColumn({ name: 'sensor_id' })
  sensor: Sensor;

  @Column({ type: 'uuid' })
  sensor_id: string;

  // Space (optional, for space-level alerts)
  @ManyToOne(() => Space, { nullable: true })
  @JoinColumn({ name: 'space_id' })
  space: Space;

  @Column({ type: 'uuid', nullable: true })
  space_id: string;

  // Tenant
  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid' })
  tenant_id: string;

  // Alert details
  @Column({ type: 'int' })
  co2_level: number;

  @Column({ type: 'int' })
  threshold_exceeded: number;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.WARNING,
  })
  severity: AlertSeverity;

  // Escalation
  @Column({ type: 'int', default: 0 })
  escalation_level: number; // 0, 1, 2... (cascade)

  @Column({ type: 'jsonb', nullable: true })
  notified_users: string[]; // Array of user IDs notified

  @Column({ type: 'timestamp', nullable: true })
  last_escalation_at: Date;

  // Status
  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column({ type: 'timestamp', nullable: true })
  acknowledged_at: Date;

  @Column({ type: 'uuid', nullable: true })
  acknowledged_by_user_id: string;

  @Column({ type: 'timestamp', nullable: true })
  resolved_at: Date;

  @Column({ type: 'text', nullable: true })
  resolution_note: string;

  // Timestamps
  @CreateDateColumn()
  created_at: Date; // triggered_at

  @UpdateDateColumn()
  updated_at: Date;
}

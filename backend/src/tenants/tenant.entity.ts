import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Sensor } from '../features/sensors/sensor.entity';
import { Space } from '../features/spaces/space.entity';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  company_name: string;

  @Column({ type: 'varchar', nullable: true })
  contact_email: string;

  @Column({ type: 'varchar', nullable: true })
  contact_phone: string;

  // KSP Integration
  @Column({ type: 'varchar', unique: true, nullable: true })
  ksp_contract_id: string;

  @Column({ type: 'varchar', nullable: true })
  ksp_username: string;

  @Column({ type: 'varchar', nullable: true })
  ksp_password_encrypted: string;

  // Settings
  @Column({ type: 'boolean', default: true })
  sync_enabled: boolean;

  @Column({ type: 'int', default: 30 })
  sync_interval_seconds: number;

  @Column({ type: 'int', default: 1000 })
  default_co2_threshold: number;

  @Column({ type: 'int', default: 5 })
  default_escalation_delay_minutes: number;

  // Status
  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  // Relations
  @OneToMany(() => User, (user) => user.tenant)
  users: User[];

  @OneToMany(() => Sensor, (sensor) => sensor.tenant)
  sensors: Sensor[];

  @OneToMany(() => Space, (space) => space.tenant)
  spaces: Space[];

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

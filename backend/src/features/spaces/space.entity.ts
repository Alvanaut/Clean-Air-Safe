import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { User } from '../../users/user.entity';
import { Sensor } from '../sensors/sensor.entity';

export enum SpaceType {
  BUILDING = 'building',
  FLOOR = 'floor',
  ROOM = 'room',
  ZONE = 'zone',
  AREA = 'area',
}

export enum VentilationLevel {
  NONE = 'none',
  NATURAL = 'natural',
  MECHANICAL = 'mechanical',
  HEPA = 'hepa',
}

export enum CleaningFrequency {
  NONE = 'none',
  WEEKLY = 'weekly',
  DAILY = 'daily',
  HOURLY = 'hourly',
}

export enum SafetyScore {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
}

export const SpaceTypeValues = {
  BUILDING: 'building' as const,
  FLOOR: 'floor' as const,
  ROOM: 'room' as const,
  ZONE: 'zone' as const,
  AREA: 'area' as const,
};

@Entity('spaces')
export class Space {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SpaceType,
    default: SpaceType.ROOM,
  })
  type: SpaceType;

  // Hierarchy
  @ManyToOne(() => Space, { nullable: true })
  @JoinColumn({ name: 'parent_space_id' })
  parent_space: Space;

  @Column({ type: 'uuid', nullable: true })
  parent_space_id: string;

  @OneToMany(() => Space, (space) => space.parent_space)
  child_spaces: Space[];

  // Hierarchy path for efficient queries (e.g., "/building1/floor2/room12")
  @Column({ type: 'varchar', nullable: true })
  hierarchy_path: string;

  // Responsible user for this space
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'responsible_user_id' })
  responsible_user: User;

  @Column({ type: 'uuid', nullable: true })
  responsible_user_id: string;

  // Tenant
  @ManyToOne(() => Tenant, (tenant) => tenant.spaces)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid' })
  tenant_id: string;

  // Sensors in this space
  @OneToMany(() => Sensor, (sensor) => sensor.space)
  sensors: Sensor[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // area_m2, capacity, etc.

  // CO2 Baseline (for color-coded thresholds)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 400 })
  co2_baseline: number;

  // Safety & Hygiene Compliance (COVID norms)
  @Column({ type: 'boolean', default: false })
  has_hydro_gel: boolean;

  @Column({ type: 'boolean', default: false })
  has_temp_check: boolean;

  @Column({ type: 'boolean', default: false })
  has_mask_required: boolean;

  @Column({
    type: 'enum',
    enum: VentilationLevel,
    default: VentilationLevel.NONE,
  })
  ventilation_level: VentilationLevel;

  @Column({ type: 'int', nullable: true })
  max_capacity: number;

  @Column({ type: 'int', nullable: true })
  current_capacity: number;

  @Column({
    type: 'enum',
    enum: CleaningFrequency,
    default: CleaningFrequency.NONE,
  })
  cleaning_frequency: CleaningFrequency;

  @Column({ type: 'boolean', default: false })
  has_isolation_room: boolean;

  @Column({ type: 'boolean', default: false })
  social_distancing: boolean;

  @Column({
    type: 'enum',
    enum: SafetyScore,
    nullable: true,
  })
  safety_score: SafetyScore;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

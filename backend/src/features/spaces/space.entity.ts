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

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

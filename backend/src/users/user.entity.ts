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
import { Tenant } from '../tenants/tenant.entity';

export enum UserRole {
  GODMODE = 'godmode',
  COMPANY_ADMIN = 'company_admin',
  MANAGER = 'manager',
  USER = 'user',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  // Role & Hierarchy
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'int', default: 1 })
  hierarchy_level: number; // 0=godmode, 1=company_admin, 2+=users

  // Parent user for hierarchy (n-1, n-2, ...)
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'parent_user_id' })
  parent_user: User;

  @Column({ type: 'uuid', nullable: true })
  parent_user_id: string | null;

  @OneToMany(() => User, (user) => user.parent_user)
  child_users: User[];

  // Tenant (null for godmode users)
  @ManyToOne(() => Tenant, (tenant) => tenant.users, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid', nullable: true })
  tenant_id: string | null;

  // Permissions
  @Column({ type: 'jsonb', nullable: true })
  permissions: Record<string, any> | null;

  // Status
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'timestamp', nullable: true })
  last_login_at: Date;

  // Timestamps
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

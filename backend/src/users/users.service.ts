import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a new user
   * Role hierarchy:
   * - GODMODE: can create anyone
   * - COMPANY_ADMIN: can create users within their tenant
   * - Others: cannot create users
   */
  async create(
    createUserDto: CreateUserDto,
    createdBy: User,
  ): Promise<User> {
    // Check permissions
    if (createdBy.role !== UserRole.GODMODE) {
      // COMPANY_ADMIN can only create users in their own tenant
      if (createdBy.role === UserRole.COMPANY_ADMIN) {
        if (!createUserDto.tenant_id || createUserDto.tenant_id !== createdBy.tenant_id) {
          throw new ForbiddenException(
            'You can only create users within your own tenant',
          );
        }
        // Cannot create GODMODE or COMPANY_ADMIN
        if (
          createUserDto.role === UserRole.GODMODE ||
          createUserDto.role === UserRole.COMPANY_ADMIN
        ) {
          throw new ForbiddenException(
            'You cannot create users with GODMODE or COMPANY_ADMIN role',
          );
        }
      } else {
        throw new ForbiddenException('You do not have permission to create users');
      }
    }

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email "${createUserDto.email}" already exists`);
    }

    // Validate parent user if provided
    if (createUserDto.parent_user_id) {
      const parentUser = await this.userRepository.findOne({
        where: { id: createUserDto.parent_user_id },
      });

      if (!parentUser) {
        throw new NotFoundException('Parent user not found');
      }

      // Parent must be in same tenant (unless creator is GODMODE)
      if (createdBy.role !== UserRole.GODMODE) {
        if (parentUser.tenant_id !== createUserDto.tenant_id) {
          throw new BadRequestException('Parent user must be in the same tenant');
        }
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = new User();
    user.email = createUserDto.email;
    user.password_hash = passwordHash;
    user.first_name = createUserDto.first_name;
    user.last_name = createUserDto.last_name;
    user.phone = createUserDto.phone || null;
    user.role = createUserDto.role || UserRole.USER;
    user.hierarchy_level = createUserDto.hierarchy_level || this.getDefaultHierarchyLevel(user.role);
    user.parent_user_id = createUserDto.parent_user_id ?? null;
    user.tenant_id = createUserDto.tenant_id ?? null;
    user.status = createUserDto.status || UserStatus.ACTIVE;
    user.permissions = createUserDto.permissions ?? null;

    return await this.userRepository.save(user);
  }

  /**
   * Get all users
   * - GODMODE: sees all users
   * - COMPANY_ADMIN: sees only users in their tenant
   * - Others: sees only their subordinates
   */
  async findAll(currentUser: User): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.tenant', 'tenant')
      .leftJoinAndSelect('user.parent_user', 'parent_user');

    if (currentUser.role === UserRole.GODMODE) {
      // GODMODE sees everyone
      return await queryBuilder.orderBy('user.created_at', 'DESC').getMany();
    } else if (currentUser.role === UserRole.COMPANY_ADMIN) {
      // COMPANY_ADMIN sees only their tenant
      return await queryBuilder
        .where('user.tenant_id = :tenantId', { tenantId: currentUser.tenant_id })
        .orderBy('user.created_at', 'DESC')
        .getMany();
    } else {
      // Others see only their subordinates
      return await this.getSubordinates(currentUser.id);
    }
  }

  /**
   * Find one user by ID
   */
  async findOne(id: string, currentUser?: User): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['tenant', 'parent_user', 'child_users'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    // Check access permissions
    if (currentUser) {
      await this.checkAccessPermission(currentUser, user);
    }

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['tenant'],
    });
  }

  /**
   * Update a user
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<User> {
    const user = await this.findOne(id);

    // Check permissions
    await this.checkUpdatePermission(currentUser, user, updateUserDto);

    // Check email conflict
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException(`User with email "${updateUserDto.email}" already exists`);
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    currentUser: User,
  ): Promise<void> {
    const user = await this.findOne(userId);

    // Users can only change their own password unless they're GODMODE
    if (currentUser.id !== userId && currentUser.role !== UserRole.GODMODE) {
      throw new ForbiddenException('You can only change your own password');
    }

    // Verify current password (except for GODMODE changing other users' passwords)
    if (currentUser.id === userId) {
      const isPasswordValid = await bcrypt.compare(
        changePasswordDto.current_password,
        user.password_hash,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // Hash new password
    user.password_hash = await bcrypt.hash(changePasswordDto.new_password, 10);
    await this.userRepository.save(user);
  }

  /**
   * Delete a user
   */
  async remove(id: string, currentUser: User): Promise<void> {
    const user = await this.findOne(id);

    // Check permissions
    if (currentUser.role !== UserRole.GODMODE) {
      if (currentUser.role === UserRole.COMPANY_ADMIN) {
        if (user.tenant_id !== currentUser.tenant_id) {
          throw new ForbiddenException('You can only delete users in your tenant');
        }
      } else {
        throw new ForbiddenException('You do not have permission to delete users');
      }
    }

    // Check if user has subordinates
    if (user.child_users && user.child_users.length > 0) {
      throw new BadRequestException(
        `Cannot delete user with ${user.child_users.length} subordinate(s). Reassign or delete them first.`,
      );
    }

    await this.userRepository.remove(user);
  }

  /**
   * Suspend a user
   */
  async suspend(id: string, currentUser: User): Promise<User> {
    const user = await this.findOne(id);
    await this.checkUpdatePermission(currentUser, user, {});

    user.status = UserStatus.SUSPENDED;
    return await this.userRepository.save(user);
  }

  /**
   * Activate a user
   */
  async activate(id: string, currentUser: User): Promise<User> {
    const user = await this.findOne(id);
    await this.checkUpdatePermission(currentUser, user, {});

    user.status = UserStatus.ACTIVE;
    return await this.userRepository.save(user);
  }

  /**
   * Get user's subordinates (all levels)
   */
  async getSubordinates(userId: string): Promise<User[]> {
    const subordinates: User[] = [];
    const queue: string[] = [userId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const directSubordinates = await this.userRepository.find({
        where: { parent_user_id: currentId },
        relations: ['tenant'],
      });

      subordinates.push(...directSubordinates);
      queue.push(...directSubordinates.map(u => u.id));
    }

    return subordinates;
  }

  /**
   * Get user's hierarchy chain (from user to root)
   */
  async getHierarchyChain(userId: string): Promise<User[]> {
    const chain: User[] = [];
    let currentUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['parent_user'],
    });

    while (currentUser) {
      chain.push(currentUser);
      if (currentUser.parent_user) {
        currentUser = await this.userRepository.findOne({
          where: { id: currentUser.parent_user.id },
          relations: ['parent_user'],
        });
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Get users by tenant
   */
  async findByTenant(tenantId: string): Promise<User[]> {
    return await this.userRepository.find({
      where: { tenant_id: tenantId },
      relations: ['parent_user'],
      order: { hierarchy_level: 'ASC', created_at: 'DESC' },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      last_login_at: new Date(),
    });
  }

  // ==================== Helper Methods ====================

  private getDefaultHierarchyLevel(role: UserRole): number {
    switch (role) {
      case UserRole.GODMODE:
        return 0;
      case UserRole.COMPANY_ADMIN:
        return 1;
      case UserRole.MANAGER:
        return 2;
      default:
        return 3;
    }
  }

  private async checkAccessPermission(currentUser: User, targetUser: User): Promise<void> {
    if (currentUser.role === UserRole.GODMODE) {
      return; // GODMODE can access anyone
    }

    if (currentUser.id === targetUser.id) {
      return; // Can always access own profile
    }

    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (targetUser.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only access users in your tenant');
      }
      return;
    }

    // Check if target is subordinate
    const subordinates = await this.getSubordinates(currentUser.id);
    if (!subordinates.find(u => u.id === targetUser.id)) {
      throw new ForbiddenException('You can only access your subordinates');
    }
  }

  private async checkUpdatePermission(
    currentUser: User,
    targetUser: User,
    updateDto: UpdateUserDto,
  ): Promise<void> {
    if (currentUser.role === UserRole.GODMODE) {
      return; // GODMODE can update anyone
    }

    if (currentUser.role === UserRole.COMPANY_ADMIN) {
      if (targetUser.tenant_id !== currentUser.tenant_id) {
        throw new ForbiddenException('You can only update users in your tenant');
      }

      // Cannot change role to GODMODE or COMPANY_ADMIN
      if (
        updateDto.role === UserRole.GODMODE ||
        updateDto.role === UserRole.COMPANY_ADMIN
      ) {
        throw new ForbiddenException('You cannot assign GODMODE or COMPANY_ADMIN role');
      }

      return;
    }

    throw new ForbiddenException('You do not have permission to update users');
  }
}

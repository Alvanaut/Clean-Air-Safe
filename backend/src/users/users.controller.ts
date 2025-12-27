import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from './user.entity';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Users Controller
 * Handles user management with role-based access control
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create a new user
   * POST /api/users
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post()
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    const user = await this.usersService.create(createUserDto, currentUser);

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User created successfully',
      data: userWithoutPassword,
      created_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }

  /**
   * Get all users (filtered by role)
   * GET /api/users
   */
  @Get()
  async findAll(@CurrentUser() currentUser: User) {
    const users = await this.usersService.findAll(currentUser);

    // Remove password_hash from all users
    const usersWithoutPassword = users.map(({ password_hash, ...user }) => user);

    return {
      success: true,
      count: usersWithoutPassword.length,
      data: usersWithoutPassword,
    };
  }

  /**
   * Get current user profile
   * GET /api/users/me
   */
  @Get('me')
  async getProfile(@CurrentUser() currentUser: User) {
    const user = await this.usersService.findOne(currentUser.id);
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      data: userWithoutPassword,
    };
  }

  /**
   * Get users by tenant
   * GET /api/users/tenant/:tenantId
   * Accessible by: GODMODE only
   */
  @Get('tenant/:tenantId')
  @Roles(UserRole.GODMODE)
  async findByTenant(@Param('tenantId') tenantId: string) {
    const users = await this.usersService.findByTenant(tenantId);
    const usersWithoutPassword = users.map(({ password_hash, ...user }) => user);

    return {
      success: true,
      count: usersWithoutPassword.length,
      data: usersWithoutPassword,
    };
  }

  /**
   * Get one user by ID
   * GET /api/users/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const user = await this.usersService.findOne(id, currentUser);
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      data: userWithoutPassword,
    };
  }

  /**
   * Get user's subordinates
   * GET /api/users/:id/subordinates
   */
  @Get(':id/subordinates')
  async getSubordinates(@Param('id') id: string, @CurrentUser() currentUser: User) {
    // Check if current user can access this user
    await this.usersService.findOne(id, currentUser);

    const subordinates = await this.usersService.getSubordinates(id);
    const subordinatesWithoutPassword = subordinates.map(({ password_hash, ...user }) => user);

    return {
      success: true,
      count: subordinatesWithoutPassword.length,
      data: subordinatesWithoutPassword,
    };
  }

  /**
   * Get user's hierarchy chain
   * GET /api/users/:id/hierarchy
   */
  @Get(':id/hierarchy')
  async getHierarchy(@Param('id') id: string, @CurrentUser() currentUser: User) {
    // Check if current user can access this user
    await this.usersService.findOne(id, currentUser);

    const chain = await this.usersService.getHierarchyChain(id);
    const chainWithoutPassword = chain.map(({ password_hash, ...user }) => user);

    return {
      success: true,
      count: chainWithoutPassword.length,
      data: chainWithoutPassword,
    };
  }

  /**
   * Update a user
   * PUT /api/users/:id
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Put(':id')
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    const user = await this.usersService.update(id, updateUserDto, currentUser);
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User updated successfully',
      data: userWithoutPassword,
      updated_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }

  /**
   * Change user password
   * POST /api/users/:id/change-password
   */
  @Post(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() currentUser: User,
  ) {
    await this.usersService.changePassword(id, changePasswordDto, currentUser);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  /**
   * Suspend a user
   * POST /api/users/:id/suspend
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async suspend(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const user = await this.usersService.suspend(id, currentUser);
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User suspended successfully',
      data: userWithoutPassword,
      suspended_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }

  /**
   * Activate a user
   * POST /api/users/:id/activate
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async activate(@Param('id') id: string, @CurrentUser() currentUser: User) {
    const user = await this.usersService.activate(id, currentUser);
    const { password_hash, ...userWithoutPassword } = user;

    return {
      success: true,
      message: 'User activated successfully',
      data: userWithoutPassword,
      activated_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }

  /**
   * Delete a user
   * DELETE /api/users/:id
   * Accessible by: GODMODE, COMPANY_ADMIN
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.GODMODE, UserRole.COMPANY_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() currentUser: User) {
    await this.usersService.remove(id, currentUser);

    return {
      success: true,
      message: 'User deleted successfully',
      deleted_by: {
        user_id: currentUser.id,
        email: currentUser.email,
      },
    };
  }
}

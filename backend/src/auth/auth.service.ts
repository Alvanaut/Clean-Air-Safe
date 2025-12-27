import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Tenant } from '../tenants/tenant.entity';
import { JwtPayload } from './strategies/jwt.strategy';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantId: string | null;
  };
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  tenantId?: string; // For GODMODE creating users for tenants
  role?: UserRole; // Only GODMODE can set this
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials (used by LocalStrategy)
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['tenant'],
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      return null;
    }

    return user;
  }

  /**
   * Login - Generate JWT tokens
   */
  async login(user: User): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenant_id,
      role: user.role,
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        tenantId: user.tenant_id,
      },
    };
  }

  /**
   * Register new user
   */
  async register(dto: RegisterDto, createdBy?: User): Promise<LoginResponse> {
    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Validate password strength
    if (dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Determine tenant and role
    let tenantId: string | null;
    let role: UserRole;

    if (createdBy) {
      // User created by another user
      if (createdBy.role === UserRole.GODMODE) {
        // GODMODE can create users for any tenant with any role
        tenantId = dto.tenantId ?? createdBy.tenant_id ?? null;
        role = dto.role || UserRole.COMPANY_ADMIN;
      } else if (createdBy.role === UserRole.COMPANY_ADMIN) {
        // COMPANY_ADMIN can only create users in their own tenant
        tenantId = createdBy.tenant_id ?? null;
        role = dto.role || UserRole.MANAGER;

        // Prevent COMPANY_ADMIN from creating GODMODE users
        if (role === UserRole.GODMODE) {
          throw new UnauthorizedException(
            'Only GODMODE can create GODMODE users',
          );
        }
      } else {
        throw new UnauthorizedException('Insufficient permissions to create users');
      }
    } else {
      // Self-registration (should be disabled in production or limited to specific tenants)
      if (!dto.tenantId) {
        throw new BadRequestException('Tenant ID required for registration');
      }
      tenantId = dto.tenantId;
      role = UserRole.USER; // Default role for self-registration
    }

    // Verify tenant exists (skip for GODMODE with null tenant)
    if (tenantId) {
      const tenant = await this.tenantRepository.findOne({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new BadRequestException('Invalid tenant');
      }
    }

    // Create user
    const user = new User();
    user.email = dto.email;
    user.password_hash = passwordHash;
    user.first_name = dto.firstName;
    user.last_name = dto.lastName;
    user.phone = dto.phone || null;
    user.tenant_id = tenantId;
    user.role = role;
    user.status = UserStatus.ACTIVE;
    user.hierarchy_level = 1; // Default, can be updated later

    const savedUser = await this.userRepository.save(user);

    // Reload user with tenant relation for response
    const userWithTenant = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['tenant'],
    });

    return this.login(userWithTenant!);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid token');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        role: user.role,
      };

      const access_token = this.jwtService.sign(newPayload);

      return { access_token };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate token (for testing)
   */
  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['tenant'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

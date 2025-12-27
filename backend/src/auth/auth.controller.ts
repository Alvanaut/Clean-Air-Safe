import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { AuthService, RegisterDto, LoginResponse } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { User } from '../users/user.entity';

export class LoginDto {
  email: string;
  password: string;
}

export class RefreshTokenDto {
  refresh_token: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Login with email/password
   * POST /api/auth/login
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@CurrentUser() user: User): Promise<LoginResponse> {
    return this.authService.login(user);
  }

  /**
   * Register new user (self-registration)
   * POST /api/auth/register
   */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<LoginResponse> {
    return this.authService.register(dto);
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ access_token: string }> {
    return this.authService.refreshToken(dto.refresh_token);
  }

  /**
   * Get current user info (requires authentication)
   * GET /api/auth/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      tenantId: user.tenant_id,
      tenant: {
        id: user.tenant?.id,
        name: user.tenant?.name,
      },
      hierarchyLevel: user.hierarchy_level,
      status: user.status,
    };
  }

  /**
   * Validate token (for testing)
   * POST /api/auth/validate
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('validate')
  async validateToken(@Body() body: { token: string }) {
    const user = await this.authService.validateToken(body.token);
    return {
      valid: true,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}

import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';
import { UserRole, UserStatus } from '../user.entity';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsInt()
  @Min(0)
  @IsOptional()
  hierarchy_level?: number;

  @IsUUID()
  @IsOptional()
  parent_user_id?: string;

  @IsUUID()
  @IsOptional()
  tenant_id?: string;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsObject()
  @IsOptional()
  permissions?: Record<string, any>;
}

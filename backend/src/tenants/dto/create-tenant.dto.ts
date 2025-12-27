import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
  IsObject,
} from 'class-validator';
import { TenantStatus } from '../tenant.entity';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  company_name?: string;

  @IsEmail()
  @IsOptional()
  contact_email?: string;

  @IsString()
  @IsOptional()
  contact_phone?: string;

  // KSP Integration
  @IsString()
  @IsOptional()
  ksp_contract_id?: string;

  @IsString()
  @IsOptional()
  ksp_username?: string;

  @IsString()
  @IsOptional()
  ksp_password_encrypted?: string;

  // Settings
  @IsBoolean()
  @IsOptional()
  sync_enabled?: boolean;

  @IsInt()
  @Min(10)
  @IsOptional()
  sync_interval_seconds?: number;

  @IsInt()
  @Min(100)
  @IsOptional()
  default_co2_threshold?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  default_escalation_delay_minutes?: number;

  // Status
  @IsEnum(TenantStatus)
  @IsOptional()
  status?: TenantStatus;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}

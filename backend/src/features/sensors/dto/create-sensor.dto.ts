import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsObject,
} from 'class-validator';
import { SensorStatus } from '../sensor.entity';

export class CreateSensorDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  ksp_device_id: string;

  @IsString()
  @IsOptional()
  ksp_serial_number?: string;

  @IsString()
  @IsOptional()
  ksp_timezone?: string;

  @IsUUID()
  tenant_id: string;

  @IsUUID()
  @IsOptional()
  space_id?: string;

  @IsUUID()
  @IsOptional()
  responsible_user_id?: string;

  @IsEnum(SensorStatus)
  @IsOptional()
  status?: SensorStatus;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

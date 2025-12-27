import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateSensorDto } from './create-sensor.dto';

// Omit ksp_device_id and tenant_id from update - these should not be changed
export class UpdateSensorDto extends PartialType(
  OmitType(CreateSensorDto, ['ksp_device_id', 'tenant_id'] as const),
) {}

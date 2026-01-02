import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveAlertDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolution_note?: string;
}

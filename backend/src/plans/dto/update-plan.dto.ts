import {
  IsOptional, IsString, IsInt, Min, IsArray, IsBoolean, ValidateIf, IsIn,
} from 'class-validator';
import { PlanFeature } from '../plan.entity';

const FEATURES: PlanFeature[] = ['whatsapp', 'libreta_digital', 'reportes', 'reproductivo'];

// Campos editables por el super admin. tier_key / role_target NO se tocan
// (definen la identidad del plan).
export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price_ars?: number;

  // null = ilimitado
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  horse_limit?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  staff_limit?: number | null;

  @IsOptional()
  @IsArray()
  @IsIn(FEATURES, { each: true })
  features?: PlanFeature[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

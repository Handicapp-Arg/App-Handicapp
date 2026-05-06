import { IsOptional, IsNumber, Min, Max, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class TrainingMetricsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distance_km?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  intensity?: number;

  @IsOptional()
  @IsString()
  discipline?: string;
}

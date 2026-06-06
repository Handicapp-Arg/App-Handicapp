import { IsOptional, IsEnum, IsString } from 'class-validator';

export class AuctionsQueryDto {
  @IsOptional()
  @IsEnum(['draft', 'active', 'paused', 'closed', 'sold', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsEnum(['venta_directa', 'remate'])
  type?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

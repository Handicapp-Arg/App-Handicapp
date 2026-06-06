import {
  IsNotEmpty, IsOptional, IsUUID, IsEnum, IsString,
  IsNumber, IsPositive, IsDateString, IsBoolean, Min, Max,
  ValidateIf,
} from 'class-validator';

export class CreateAuctionDto {
  @IsUUID()
  horse_id: string;

  @IsEnum(['venta_directa', 'remate'])
  type: 'venta_directa' | 'remate';

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @ValidateIf((o) => o.type === 'venta_directa')
  @IsNumber()
  @IsPositive()
  asking_price?: number;

  @ValidateIf((o) => o.type === 'remate')
  @IsNumber()
  @IsPositive()
  starting_bid?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  reserve_price?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  bid_increment?: number;

  @IsEnum(['ARS', 'USD'])
  currency: 'ARS' | 'USD';

  @ValidateIf((o) => o.type === 'remate')
  @IsDateString()
  auction_start?: string;

  @ValidateIf((o) => o.type === 'remate')
  @IsDateString()
  auction_end?: string;

  @IsOptional()
  @IsBoolean()
  has_health_cert?: boolean;

  @IsOptional()
  @IsString()
  health_cert_url?: string;

  @IsOptional()
  @IsBoolean()
  has_ownership_docs?: boolean;

  @IsOptional()
  @IsString()
  payment_terms?: string;

  @IsOptional()
  @IsString()
  delivery_terms?: string;

  @IsOptional()
  @IsString()
  location?: string;
}

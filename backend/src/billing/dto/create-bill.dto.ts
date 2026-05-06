import { IsUUID, IsInt, IsArray, IsString, IsNumber, Min, Max, ValidateNested, IsOptional, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class BillItemDto {
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsNumber()
  @Min(0)
  unit_price: number;
}

export class CreateBillDto {
  @IsUUID()
  horse_id: string;

  @IsUUID()
  owner_id: string;

  @IsInt() @Min(1) @Max(12)
  month: number;

  @IsInt() @Min(2020)
  year: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['ARS', 'USD'])
  currency?: 'ARS' | 'USD';
}

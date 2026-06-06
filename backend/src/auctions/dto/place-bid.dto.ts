import { IsNumber, IsPositive, IsOptional, IsString } from 'class-validator';

export class PlaceBidDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

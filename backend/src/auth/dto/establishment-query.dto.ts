import { IsOptional, IsString } from 'class-validator';

export class EstablishmentQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

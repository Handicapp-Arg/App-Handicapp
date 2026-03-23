import { IsOptional, IsNotEmpty, IsDateString, IsUUID } from 'class-validator';

export class UpdateHorseDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string | null;

  @IsOptional()
  @IsUUID()
  establishment_id?: string | null;
}

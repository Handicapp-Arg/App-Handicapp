import { IsOptional, IsNotEmpty, IsDateString } from 'class-validator';

export class UpdateHorseDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string | null;
}

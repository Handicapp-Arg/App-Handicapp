import { IsNotEmpty, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateHorseDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsUUID()
  owner_id?: string;

  @IsOptional()
  @IsUUID()
  establishment_id?: string;
}

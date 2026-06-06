import { IsNotEmpty, IsOptional, IsDateString, IsUUID, IsString, IsEnum, IsInt, Min, Max, Matches } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/, { message: 'El microchip debe tener exactamente 15 dígitos numéricos' })
  microchip?: string;

  @IsOptional()
  @IsUUID()
  breed_id?: string;

  @IsOptional()
  @IsUUID()
  activity_id?: string;

  @IsOptional()
  @IsEnum(['macho', 'hembra', 'castrado'])
  sex?: 'macho' | 'hembra' | 'castrado';

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(80)
  @Max(220)
  height_cm?: number;
}

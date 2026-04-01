import { IsOptional, IsNotEmpty, IsDateString, IsUUID, IsString, Matches, ValidateIf } from 'class-validator';

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

  @IsOptional()
  @ValidateIf((o) => o.microchip !== null)
  @IsString()
  @Matches(/^\d{15}$/, { message: 'El microchip debe tener exactamente 15 dígitos numéricos' })
  microchip?: string | null;

  @IsOptional()
  @IsUUID()
  breed_id?: string | null;

  @IsOptional()
  @IsUUID()
  activity_id?: string | null;
}

import { IsUUID, IsOptional, IsString, IsDateString, Length } from 'class-validator';

export class SubmitClaimDto {
  @IsUUID()
  horse_record_id: string;

  @IsString()
  @IsOptional()
  registration_number?: string;

  @IsString()
  @IsOptional()
  @Length(10, 15)
  microchip?: string;

  @IsDateString()
  @IsOptional()
  claimed_birth_date?: string;

  @IsString()
  @IsOptional()
  document_url?: string;

  @IsString()
  @IsOptional()
  document_public_id?: string;
}

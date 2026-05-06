import { IsEnum, IsDateString, IsString, IsOptional } from 'class-validator';
import { MedicalRecordType } from '../medical-record.entity';

export class CreateMedicalRecordDto {
  @IsEnum(MedicalRecordType)
  type: MedicalRecordType;

  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsDateString()
  next_due?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  batch?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

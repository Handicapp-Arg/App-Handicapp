import { IsString, IsOptional, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { DocumentType } from '../entities/pedigree.entity';

export class CreatePedigreeDto {
  @IsUUID()
  @IsOptional()
  sire_id?: string;

  @IsUUID()
  @IsOptional()
  dam_id?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  sire_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  dam_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  sire_registration_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  dam_registration_number?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  paternal_grandsire_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  paternal_granddam_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  maternal_grandsire_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  maternal_granddam_name?: string;
}

export class AdminResolveDto {
  @IsEnum(['validated', 'disputed'])
  resolution: 'validated' | 'disputed';

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  file_url: string;

  @IsString()
  file_name: string;
}

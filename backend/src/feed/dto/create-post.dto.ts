import { IsNotEmpty, IsOptional, IsEnum, IsUUID, MaxLength } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsUUID()
  horse_id?: string;

  @IsOptional()
  @IsEnum(['general', 'horse_update', 'announcement'])
  type?: 'general' | 'horse_update' | 'announcement';
}

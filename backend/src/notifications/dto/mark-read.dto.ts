import { IsUUID, IsOptional } from 'class-validator';

export class MarkReadDto {
  @IsOptional()
  @IsUUID()
  id?: string;
}

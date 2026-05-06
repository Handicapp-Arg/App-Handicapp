import { IsString, IsUUID, IsOptional, MinLength } from 'class-validator';

export class CreateContractDto {
  @IsUUID()
  owner_id: string;

  @IsUUID()
  @IsOptional()
  horse_id?: string;

  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  body: string;
}

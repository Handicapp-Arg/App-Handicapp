import { Type } from 'class-transformer';
import {
  IsUUID,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

export class OwnershipEntryDto {
  @IsUUID()
  user_id: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  percentage: number;
}

export class UpdateOwnershipDto {
  @ValidateNested({ each: true })
  @Type(() => OwnershipEntryDto)
  @ArrayMinSize(1)
  owners: OwnershipEntryDto[];
}

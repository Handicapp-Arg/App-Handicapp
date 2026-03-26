import {
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsUUID,
  IsOptional,
  IsNumberString,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';
import { EventType } from '../event.entity';

export class CreateBulkEventDto {
  @IsEnum(EventType)
  type: EventType;

  @IsNotEmpty()
  description: string;

  @IsDateString()
  date: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Debés seleccionar al menos un caballo' })
  @IsUUID('4', { each: true })
  horse_ids: string[];

  @IsOptional()
  @IsNumberString()
  amount?: string;
}

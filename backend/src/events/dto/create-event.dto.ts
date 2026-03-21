import { IsEnum, IsNotEmpty, IsDateString, IsUUID } from 'class-validator';
import { EventType } from '../event.entity';

export class CreateEventDto {
  @IsEnum(EventType)
  type: EventType;

  @IsNotEmpty()
  description: string;

  @IsDateString()
  date: string;

  @IsUUID()
  horse_id: string;
}

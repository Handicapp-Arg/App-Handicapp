import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { EventType } from '../event.entity';

export class EventsQueryDto {
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsDateString()
  date_from?: string;

  @IsOptional()
  @IsDateString()
  date_to?: string;

  @IsOptional()
  @IsUUID()
  horse_id?: string;
}

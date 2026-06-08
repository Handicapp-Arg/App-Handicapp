import { IsEnum, IsNotEmpty, IsDateString, IsUUID, IsOptional, IsNumberString, IsIn, IsBoolean, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { EventType } from '../event.entity';

export class CreateEventDto {
  @IsEnum(EventType)
  type: EventType;

  @IsNotEmpty()
  description: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  event_time?: string;

  @IsUUID()
  horse_id: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsIn(['ARS', 'USD'])
  currency?: 'ARS' | 'USD';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  is_public?: boolean;

  @IsOptional()
  @IsIn(['none', 'daily', 'weekly', 'biweekly', 'monthly'])
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

  @IsOptional()
  @IsDateString()
  recurrence_end?: string;
}

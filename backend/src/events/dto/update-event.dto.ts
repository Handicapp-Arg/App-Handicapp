import { IsEnum, IsDateString, IsOptional, IsNumberString, IsNotEmpty } from 'class-validator';
import { EventType } from '../event.entity';

export class UpdateEventDto {
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;
}

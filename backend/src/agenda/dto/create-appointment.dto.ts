import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID } from 'class-validator';
import { AppointmentType } from '../service-appointment.entity';

export class CreateAppointmentDto {
  @IsUUID()
  horse_id: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  @IsString()
  title: string;

  @IsISO8601()
  scheduled_at: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

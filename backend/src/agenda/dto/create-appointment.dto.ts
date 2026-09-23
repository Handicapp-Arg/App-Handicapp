import {
  IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { AppointmentType } from '../service-appointment.entity';

export class CreateAppointmentDto {
  @IsUUID()
  horse_id: string;

  @IsEnum(AppointmentType)
  type: AppointmentType;

  // La columna es varchar(255): sin el tope, un título largo pasaba la
  // validación y reventaba en Postgres con un 500 en vez de un 400 claro.
  @IsString()
  @MaxLength(255)
  title: string;

  @IsISO8601()
  scheduled_at: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Quién atiende: texto libre ("Dr. García"), no un usuario de la app. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  professional?: string | null;

  /**
   * Horas de anticipación del aviso. `null` (o 0) = no avisar.
   * El tope de 720 h (30 días) evita que un error de tipeo deje un turno
   * avisando desde un mes antes en cada corrida del cron.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  remind_hours_before?: number | null;
}

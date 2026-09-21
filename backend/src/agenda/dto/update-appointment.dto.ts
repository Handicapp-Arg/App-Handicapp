import {
  IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min,
} from 'class-validator';
import { AppointmentType } from '../service-appointment.entity';

/**
 * Todos los campos son opcionales: la pantalla de edición manda solo lo que
 * cambió. No se extiende `PartialType(CreateAppointmentDto)` para no arrastrar
 * la dependencia de `@nestjs/mapped-types` en un DTO de cinco campos.
 */
export class UpdateAppointmentDto {
  @IsOptional()
  @IsUUID()
  horse_id?: string;

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsISO8601()
  scheduled_at?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  professional?: string | null;

  /** `null` (o 0) = no avisar. Ver `CreateAppointmentDto`. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(720)
  remind_hours_before?: number | null;
}

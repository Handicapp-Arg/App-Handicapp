import {
  IsEnum, IsISO8601, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID,
  Max, MaxLength, Min, ValidateIf,
} from 'class-validator';
import { AppointmentType } from '../service-appointment.entity';

/**
 * Todos los campos son opcionales: la pantalla de edición manda solo lo que
 * cambió. No se extiende `PartialType(CreateAppointmentDto)` para no arrastrar
 * la dependencia de `@nestjs/mapped-types` en un DTO de cinco campos.
 *
 * OJO con `@IsOptional()`: en class-validator deja pasar `null`, no solo
 * `undefined`. En los campos que la base tiene como obligatorios eso alcanzaba
 * para romper: `{"scheduled_at": null}` pasaba la validación, `new Date(null)`
 * da 1970 (no una fecha inválida, así que nada lo detecta) y el turno se
 * guardaba en 1970 devolviendo 200. Desaparecía de la agenda sin un solo error.
 * Por eso los obligatorios usan `@ValidateIf(v => v !== undefined)`, que SÍ
 * valida el `null` y lo rechaza con 400.
 */
export class UpdateAppointmentDto {
  @ValidateIf((_, v) => v !== undefined)
  @IsUUID()
  horse_id?: string;

  @ValidateIf((_, v) => v !== undefined)
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ValidateIf((_, v) => v !== undefined)
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

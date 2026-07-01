import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from './password.decorator';

/** Ids de tono de la paleta de avatar (debe coincidir con avatar-color en web/móvil). */
export const AVATAR_COLOR_IDS = [
  'cuero', 'terracota', 'ocre', 'oliva', 'herrumbre', 'piedra', 'vino', 'musgo',
] as const;

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNotEmpty()
  name?: string;

  // null = volver a color automático; un id válido = color elegido.
  @IsOptional()
  @IsIn([...AVATAR_COLOR_IDS, null])
  avatar_color?: string | null;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  whatsapp_opt_in?: boolean;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}

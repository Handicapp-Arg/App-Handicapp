import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Política de contraseña: 8–72 chars, al menos una letra y un número.
 * 72 es el límite real de bcrypt.
 */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' }),
    Matches(/[A-Za-z]/, { message: 'La contraseña debe incluir al menos una letra' }),
    Matches(/\d/, { message: 'La contraseña debe incluir al menos un número' }),
  );
}

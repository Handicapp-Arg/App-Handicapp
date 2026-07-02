import { randomInt } from 'crypto';

// Alfabeto sin caracteres ambiguos (O/0, I/1) en mayúsculas + dígitos seguros.
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Genera un código alfanumérico de 6-8 caracteres en MAYÚSCULAS,
 * sin caracteres ambiguos (O, 0, I, 1).
 */
export function generateJoinCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Genera un código único, reintentando ante colisión.
 * `exists` debe resolver `true` si el código ya está tomado.
 */
export async function generateUniqueJoinCode(
  exists: (code: string) => Promise<boolean>,
  length = 8,
  maxAttempts = 15,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateJoinCode(length);
    if (!(await exists(code))) return code;
  }
  throw new Error('No se pudo generar un código de enlace único');
}

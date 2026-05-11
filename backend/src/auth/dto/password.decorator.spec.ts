import { validate } from 'class-validator';
import { IsStrongPassword } from './password.decorator';

class Holder {
  @IsStrongPassword()
  password!: string;
}

async function validatePassword(value: unknown): Promise<string[]> {
  const h = new Holder();
  // @ts-expect-error: queremos probar valores no-string también
  h.password = value;
  const errors = await validate(h);
  const messages: string[] = [];
  for (const err of errors) {
    for (const m of Object.values(err.constraints ?? {})) {
      messages.push(m);
    }
  }
  return messages;
}

describe('IsStrongPassword', () => {
  it('acepta una contraseña con letras y números, ≥ 8 chars', async () => {
    expect(await validatePassword('handicapp2026')).toEqual([]);
  });

  it('rechaza menos de 8 caracteres', async () => {
    const errors = await validatePassword('abc12');
    expect(errors.some((e) => e.includes('al menos 8 caracteres'))).toBe(true);
  });

  it('rechaza contraseña sólo numérica', async () => {
    const errors = await validatePassword('12345678');
    expect(errors.some((e) => e.includes('al menos una letra'))).toBe(true);
  });

  it('rechaza contraseña sólo alfabética', async () => {
    const errors = await validatePassword('abcdefgh');
    expect(errors.some((e) => e.includes('al menos un número'))).toBe(true);
  });

  it('rechaza > 72 caracteres (límite real de bcrypt)', async () => {
    const errors = await validatePassword('a1' + 'x'.repeat(73));
    expect(errors.some((e) => e.includes('superar 72'))).toBe(true);
  });

  it('rechaza valor no-string', async () => {
    const errors = await validatePassword(12345678);
    expect(errors.length).toBeGreaterThan(0);
  });
});

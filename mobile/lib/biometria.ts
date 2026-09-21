import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from './secure-storage';

/**
 * Ingreso con Face ID / Touch ID, al estilo de las apps de banco:
 * tras el primer login exitoso guardamos las credenciales en el llavero
 * seguro del sistema (SecureStore = Keychain en iOS), y en los próximos
 * ingresos la biometría es la llave — reconoce la cara y entra, sin tocar
 * ningún botón.
 */

const KEY_EMAIL = 'bio_email';
const KEY_PASS = 'bio_password';

export async function biometriaDisponible(): Promise<boolean> {
  try {
    const [hw, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hw && enrolled;
  } catch {
    return false;
  }
}

/** Se llama tras un login manual exitoso: deja las credenciales listas. */
export async function guardarCredencialesBiometricas(email: string, password: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_EMAIL, email);
    await SecureStore.setItemAsync(KEY_PASS, password);
  } catch {
    // sin biometría no se rompe nada: el login manual sigue funcionando
  }
}

export async function borrarCredencialesBiometricas(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY_EMAIL);
    await SecureStore.deleteItemAsync(KEY_PASS);
  } catch {
    // silencioso
  }
}

export async function hayCredencialesGuardadas(): Promise<boolean> {
  try {
    const email = await SecureStore.getItemAsync(KEY_EMAIL);
    return Boolean(email);
  } catch {
    return false;
  }
}

/**
 * Resultado del intento de ingreso con biometría.
 *
 * Devuelve un MOTIVO y no `null` a secas: antes todos los caminos que no
 * terminaban bien devolvían lo mismo, así que la pantalla no podía distinguir
 * "cancelaste" de "el sistema falló", y terminaba no diciendo nada. Tocar el
 * botón y que no pase absolutamente nada es peor que un error.
 */
export type ResultadoBiometrico =
  | { ok: true; email: string; password: string }
  /** El usuario cerró el cuadro de Face ID. No hay nada que avisar. */
  | { ok: false; motivo: 'cancelado' }
  /** El teléfono no tiene biometría o no está configurada. */
  | { ok: false; motivo: 'sin-biometria' }
  /** Nunca se guardó una contraseña: hay que entrar una vez a mano. */
  | { ok: false; motivo: 'sin-credenciales' }
  /** Face ID existe pero no reconoció, o el sistema devolvió un error. */
  | { ok: false; motivo: 'fallo' };

export async function loginBiometrico(): Promise<ResultadoBiometrico> {
  try {
    if (!(await biometriaDisponible())) return { ok: false, motivo: 'sin-biometria' };

    const email = await SecureStore.getItemAsync(KEY_EMAIL);
    const password = await SecureStore.getItemAsync(KEY_PASS);
    if (!email || !password) return { ok: false, motivo: 'sin-credenciales' };

    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ingresá a HandicApp',
      cancelLabel: 'Usar contraseña',
      disableDeviceFallback: false,
    });
    if (r.success) return { ok: true, email, password };

    // `user_cancel` y `system_cancel` son salidas deliberadas, no errores.
    const cancelado = r.error === 'user_cancel' || r.error === 'system_cancel' || r.error === 'app_cancel';
    return { ok: false, motivo: cancelado ? 'cancelado' : 'fallo' };
  } catch {
    return { ok: false, motivo: 'fallo' };
  }
}

/** Qué decirle al usuario. `null` = no mostrar nada (canceló a propósito). */
export function mensajeBiometrico(motivo: Exclude<ResultadoBiometrico, { ok: true }>['motivo']): string | null {
  switch (motivo) {
    case 'cancelado': return null;
    case 'sin-biometria': return 'Este teléfono no tiene Face ID configurado.';
    case 'sin-credenciales': return 'Entrá una vez con tu contraseña y después Face ID queda listo.';
    case 'fallo': return 'No pudimos usar Face ID. Probá con tu contraseña.';
  }
}

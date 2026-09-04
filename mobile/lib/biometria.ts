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
 * Pide Face ID y, si pasa, devuelve las credenciales guardadas.
 * `null` = canceló, falló o no hay nada guardado → login manual normal.
 */
export async function loginBiometrico(): Promise<{ email: string; password: string } | null> {
  try {
    if (!(await biometriaDisponible())) return null;
    const email = await SecureStore.getItemAsync(KEY_EMAIL);
    const password = await SecureStore.getItemAsync(KEY_PASS);
    if (!email || !password) return null;

    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Ingresá a HandicApp',
      cancelLabel: 'Usar contraseña',
      disableDeviceFallback: false,
    });
    if (!r.success) return null;
    return { email, password };
  } catch {
    return null;
  }
}

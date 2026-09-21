import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getItemAsync, setItemAsync } from './secure-storage';

/**
 * Sistema de tema (claro / oscuro). Tokens SEMÁNTICOS: las pantallas usan
 * `const { c } = useTheme()` y aplican `c.bg`, `c.surface`, `c.text`, etc.
 * Así el mismo código se ve bien en ambos temas sin hardcodear colores.
 */
export type ThemeColors = {
  bg: string;          // fondo general de la pantalla
  surface: string;     // tarjetas / superficies elevadas
  surfaceAlt: string;  // inputs / superficies sutiles
  text: string;        // texto principal
  textMuted: string;   // texto secundario
  textFaint: string;   // texto terciario / placeholders
  border: string;      // bordes sutiles / divisores
  borderStrong: string;// bordes marcados
  brand: string;       // acento de marca (verde campo) — la acción, nunca el relleno
  brandSoft: string;   // fondo de acento sutil
  goldSoft: string;    // fondo dorado (planes de pago / dueño), theme-aware
  goldBorder: string;  // borde dorado, theme-aware
  goldText: string;    // texto sobre fondo dorado, theme-aware
  danger: string;      // rojo — peligro / eliminar / vencido (theme-aware)
  dangerSoft: string;  // fondo rojo sutil
  success: string;     // verde — ok / confirmado / firmado
  successSoft: string; // fondo verde sutil
  warning: string;     // ámbar — atención / pendiente
  warningSoft: string; // fondo ámbar sutil
  info: string;        // azul — informativo / neutro-frío, y la línea PATERNA del pedigrí
  infoSoft: string;    // fondo azul sutil
  dam: string;         // la línea MATERNA del pedigrí
  overlay: string;     // fondo de modales
  isDark: boolean;
};

/**
 * Campo abierto 2026. La regla de color: el crema es la superficie, el blanco
 * es la tarjeta, el verde es la acción. El cuero quedó como calidez del fondo,
 * no como acento: pintar de marrón cada tarjeta es lo que hacía ver la app
 * genérica. El verde aparece poco y por eso se nota cuando aparece.
 */
const light: ThemeColors = {
  bg: '#fbfaf7',
  surface: '#ffffff',
  surfaceAlt: '#f2eee7',
  text: '#15140f',
  textMuted: '#7c766c',
  textFaint: '#a9a298',
  border: '#efebe3',
  borderStrong: '#dfd9cf',
  brand: '#17715a',
  brandSoft: '#e8f3ed',
  goldSoft: '#f5f1e9',
  goldBorder: '#e4d9be',
  goldText: '#8a6a14',
  danger: '#d8563f',  dangerSoft: '#fbeeea',
  success: '#17715a', successSoft: '#e8f3ed',
  warning: '#c89a2b', warningSoft: '#f8f1df',
  info: '#3b4b8c',    infoSoft: '#eff1f7',
  dam: '#b2557a',
  overlay: 'rgba(21,20,15,0.35)',
  isDark: false,
};

/**
 * De noche el verde sube de luz (#5fc08f) porque el profundo no contrasta
 * contra el fondo casi negro. Los semánticos se aclaran por la misma razón.
 */
const dark: ThemeColors = {
  bg: '#100f0c',
  surface: '#1c1a16',
  surfaceAlt: '#262320',
  text: '#f3f0e9',
  textMuted: '#8f8879',
  textFaint: '#6b655a',
  border: '#2a2722',
  borderStrong: '#3d3830',
  brand: '#5fc08f',
  brandSoft: 'rgba(95,192,143,0.14)',
  goldSoft: 'rgba(200,154,43,0.14)',
  goldBorder: 'rgba(200,154,43,0.32)',
  goldText: '#e0b450',
  danger: '#e8836d',  dangerSoft: 'rgba(232,131,109,0.15)',
  success: '#5fc08f', successSoft: 'rgba(95,192,143,0.15)',
  warning: '#e0b450', warningSoft: 'rgba(224,180,80,0.15)',
  info: '#8a9ad8',    infoSoft: 'rgba(138,154,216,0.15)',
  dam: '#d98cae',
  overlay: 'rgba(0,0,0,0.6)',
  isDark: true,
};

export type ThemePreference = 'auto' | 'light' | 'dark';
const STORAGE_KEY = 'theme-preference';

type ThemeContextValue = {
  c: ThemeColors;
  scheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  c: light, scheme: 'light', preference: 'auto', setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');

  useEffect(() => {
    getItemAsync(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'auto') setPreferenceState(v);
    }).catch(() => {});
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    void setItemAsync(STORAGE_KEY, p).catch(() => {});
  };

  const scheme: 'light' | 'dark' = preference === 'auto'
    ? (system === 'dark' ? 'dark' : 'light')
    : preference;
  const c = scheme === 'dark' ? dark : light;

  return (
    <ThemeContext.Provider value={{ c, scheme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

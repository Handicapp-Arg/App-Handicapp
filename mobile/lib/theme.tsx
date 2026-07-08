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
  brand: string;       // acento de marca (cuero)
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
  info: string;        // azul — informativo / neutro-frío
  infoSoft: string;    // fondo azul sutil
  overlay: string;     // fondo de modales
  isDark: boolean;
};

const light: ThemeColors = {
  bg: '#f9fafb',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  text: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  border: '#f3f4f6',
  borderStrong: '#e5e7eb',
  brand: '#9d6c35',
  brandSoft: '#faf3e9',
  goldSoft: '#fffbeb',
  goldBorder: '#fde68a',
  goldText: '#92400e',
  danger: '#dc2626',  dangerSoft: '#fef2f2',
  success: '#059669', successSoft: '#ecfdf5',
  warning: '#d97706', warningSoft: '#fffbeb',
  info: '#2563eb',    infoSoft: '#eff6ff',
  overlay: 'rgba(0,0,0,0.35)',
  isDark: false,
};

const dark: ThemeColors = {
  bg: '#0b0b0c',
  surface: '#18181b',
  surfaceAlt: '#232327',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  textFaint: '#6b6b73',
  border: '#27272a',
  borderStrong: '#3f3f46',
  brand: '#d2aa78',
  brandSoft: 'rgba(210,170,120,0.14)',
  goldSoft: 'rgba(245,158,11,0.12)',
  goldBorder: 'rgba(245,158,11,0.3)',
  goldText: '#fcd34d',
  danger: '#f87171',  dangerSoft: 'rgba(248,113,113,0.15)',
  success: '#34d399', successSoft: 'rgba(52,211,153,0.15)',
  warning: '#fbbf24', warningSoft: 'rgba(251,191,36,0.15)',
  info: '#60a5fa',    infoSoft: 'rgba(96,165,250,0.15)',
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

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

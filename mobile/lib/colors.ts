export const colors = {
  primary: '#0f1f3d',
  primaryLight: '#1a3366',
  // Marca HandicApp — cuero caramelo
  brand: '#9d6c35',
  brand300: '#d2aa78',
  brand400: '#bd8a4d',
  brand600: '#7f5628',
  espresso: '#1b130c',   // fondo oscuro (login/auth)
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  red50: '#fef2f2',
  red500: '#ef4444',
  red700: '#b91c1c',
  yellow50: '#fefce8',
  yellow700: '#a16207',
  purple50: '#faf5ff',
  purple700: '#7e22ce',
  emerald50: '#ecfdf5',
  emerald700: '#047857',
  amber50: '#fffbeb',
  amber600: '#d97706',
  violet50: '#f5f3ff',
  violet700: '#6d28d9',
} as const;

import type { ThemeColors } from './theme';

export type EventTypeStyle = { bg: string; text: string; label: string };

/**
 * Colores por tipo de evento, THEME-AWARE (light/dark legibles).
 * Identidad: cuero (c.brand) SOLO como acento real (gasto). Los tipos que no
 * expresan un estado real se NEUTRALIZAN (c.textMuted / c.surfaceAlt); los que
 * sí lo hacen usan el semántico del theme (aviso -> warning, salud -> info).
 *
 * API: `makeEventTypeColors(c)[type]` -> { bg, text, label }.
 * Usado por EventTypeBadge y eventos.tsx.
 */
export function makeEventTypeColors(c: ThemeColors): Record<string, EventTypeStyle> {
  const neutral = { bg: c.surfaceAlt, text: c.textMuted };
  return {
    salud:         { bg: c.infoSoft, text: c.info, label: 'Salud' },        // informativo -> semántico
    entrenamiento: { ...neutral, label: 'Entrenamiento' },
    gasto:         { bg: c.brandSoft, text: c.brand, label: 'Gasto' },      // acento cuero (identidad)
    nota:          { ...neutral, label: 'Nota' },
    carrera:       { ...neutral, label: 'Carrera' },
    tarea:         { ...neutral, label: 'Tarea' },
    aviso:         { bg: c.warningSoft, text: c.warning, label: 'Aviso' },  // atención -> semántico
  };
}

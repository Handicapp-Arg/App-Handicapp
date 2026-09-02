import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, touch } from './tokens';

/**
 * Estilos compartidos entre pantallas, sensibles al tema (claro / oscuro).
 * Consumir vía el hook `useCommonStyles()` dentro de un componente:
 *   const { layout, typography, modal, button, input, card } = useCommonStyles();
 * Así los colores siguen el tema activo sin hardcodear.
 */

export const makeLayout = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screen: { flex: 1, backgroundColor: c.bg },
});

export const makeTypography = (c: ThemeColors) => StyleSheet.create({
  pageTitle: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  bodyLg: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },
  body: { fontSize: text.sm, color: c.textMuted, lineHeight: 20 },
  caption: { fontSize: text.xs, color: c.textFaint },
  label: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  link: { fontSize: text.sm, fontWeight: weight.bold, color: c.brand },
});

/**
 * Tarjetas SIN borde: la jerarquía la dan el fondo y una sombra apenas
 * perceptible, como en Instagram/Airbnb. El borde gris alrededor de cada cosa
 * era lo que hacía ver la app como un wireframe. En oscuro la sombra no se ve:
 * alcanza el contraste surface (#18181b) sobre bg (#0b0b0c).
 */
export const makeCard = (c: ThemeColors) => StyleSheet.create({
  base: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    ...(c.isDark ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  padded: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    padding: space[4],
    ...(c.isDark ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
  overflow: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    ...(c.isDark ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    }),
  },
});

export const makeInput = (c: ThemeColors) => StyleSheet.create({
  base: {
    height: touch.field,
    // Relleno sin borde visible (estilo Instagram/Airbnb); el 1.5 transparente
    // evita el salto de layout cuando el foco pinta el borde.
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    fontSize: text.md,
    color: c.text,
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
  },
  /** Igual que `base` pero para el campo enfocado. */
  focused: {
    borderColor: c.brand,
    backgroundColor: c.surface,
  },
  multiline: {
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    fontSize: text.md,
    color: c.text,
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
    minHeight: 104,
    textAlignVertical: 'top' as const,
  },
});

export const makeButton = (c: ThemeColors) => StyleSheet.create({
  primary: {
    backgroundColor: c.brand,
    borderRadius: radius.lg,
    height: touch.button,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondary: {
    borderRadius: radius.lg,
    height: touch.button,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
  },
  danger: {
    borderWidth: 1.5,
    borderColor: c.isDark ? 'rgba(239,68,68,0.4)' : '#fecaca',
    borderRadius: radius.lg,
    height: touch.button,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2',
  },
  primaryText: { fontSize: text.md, fontWeight: weight.bold, color: colors.white, letterSpacing: -0.2 },
  secondaryText: { fontSize: text.md, fontWeight: weight.semibold, color: c.textMuted, letterSpacing: -0.2 },
  dangerText: { fontSize: text.md, fontWeight: weight.bold, color: c.isDark ? '#f87171' : colors.red700 },
});

export const makeModal = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '90%' as unknown as number,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: space[5],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  title: { fontSize: text.md, fontWeight: weight.bold, color: c.text },
  closeText: { fontSize: 18, color: c.textFaint },
  body: { padding: space[5], gap: space[3] },
  footer: {
    flexDirection: 'row' as const,
    gap: space[3],
    padding: space[4],
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
});

export const badge = StyleSheet.create({
  base: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' as const },
  text: { fontSize: text.xs, fontWeight: weight.semibold },
});

export const makeDivider = (c: ThemeColors) => StyleSheet.create({
  h: { height: 1, backgroundColor: c.border },
  hIndented: { height: 1, backgroundColor: c.border, marginHorizontal: space[3] },
});

/** Hook único: devuelve todos los grupos de estilos para el tema activo. */
export function useCommonStyles() {
  const { c } = useTheme();
  return useMemo(() => ({
    layout: makeLayout(c),
    typography: makeTypography(c),
    card: makeCard(c),
    input: makeInput(c),
    button: makeButton(c),
    modal: makeModal(c),
    divider: makeDivider(c),
  }), [c]);
}

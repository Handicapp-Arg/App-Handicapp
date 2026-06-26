import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight } from './tokens';

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

export const makeCard = (c: ThemeColors) => StyleSheet.create({
  base: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  padded: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: space[4],
  },
  overflow: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden' as const,
  },
});

export const makeInput = (c: ThemeColors) => StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: text.sm,
    color: c.text,
    backgroundColor: c.surfaceAlt,
  },
  multiline: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: text.sm,
    color: c.text,
    backgroundColor: c.surfaceAlt,
    height: 88,
    textAlignVertical: 'top' as const,
  },
});

export const makeButton = (c: ThemeColors) => StyleSheet.create({
  primary: {
    backgroundColor: c.brand,
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center' as const,
  },
  secondary: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center' as const,
    backgroundColor: c.surface,
  },
  danger: {
    borderWidth: 1,
    borderColor: c.isDark ? 'rgba(239,68,68,0.4)' : '#fecaca',
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center' as const,
    backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2',
  },
  primaryText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  secondaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  dangerText: { fontSize: text.sm, fontWeight: weight.bold, color: c.isDark ? '#f87171' : colors.red700 },
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

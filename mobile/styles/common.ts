import { StyleSheet } from 'react-native';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from './tokens';

/**
 * Estilos compartidos entre pantallas.
 * Importar lo que se necesite en lugar de redefinir.
 */

export const layout = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screen: { flex: 1, backgroundColor: colors.gray50 },
});

export const typography = StyleSheet.create({
  pageTitle: { fontSize: text.lg, fontWeight: weight.extrabold, color: colors.gray900 },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  bodyLg: { fontSize: text.base, color: colors.gray700, lineHeight: 22 },
  body: { fontSize: text.sm, color: colors.gray700, lineHeight: 20 },
  caption: { fontSize: text.xs, color: colors.gray400 },
  label: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  link: { fontSize: text.sm, fontWeight: weight.bold, color: colors.primary },
});

export const card = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  padded: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray100,
    padding: space[4],
  },
  overflow: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray100,
    overflow: 'hidden' as const,
  },
});

export const input = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: text.sm,
    color: colors.gray900,
    backgroundColor: colors.gray50,
  },
  multiline: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontSize: text.sm,
    color: colors.gray900,
    backgroundColor: colors.gray50,
    height: 88,
    textAlignVertical: 'top' as const,
  },
});

export const button = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center' as const,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center' as const,
    backgroundColor: colors.white,
  },
  danger: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radius.md,
    paddingVertical: space[3],
    alignItems: 'center' as const,
    backgroundColor: '#fef2f2',
  },
  primaryText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  secondaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray600 },
  dangerText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.red700 },
});

export const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
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
    borderBottomColor: colors.gray100,
  },
  title: { fontSize: text.md, fontWeight: weight.bold, color: colors.gray900 },
  closeText: { fontSize: 18, color: colors.gray400 },
  body: { padding: space[5], gap: space[3] },
  footer: {
    flexDirection: 'row' as const,
    gap: space[3],
    padding: space[4],
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
});

export const badge = StyleSheet.create({
  base: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' as const },
  text: { fontSize: text.xs, fontWeight: weight.semibold },
});

export const divider = StyleSheet.create({
  h: { height: 1, backgroundColor: colors.gray100 },
  hIndented: { height: 1, backgroundColor: colors.gray100, marginHorizontal: space[3] },
});

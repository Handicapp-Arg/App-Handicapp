import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from './tokens';

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

  /**
   * Los dos encabezados de sección de la app. Antes cada pantalla se lo escribía
   * a mano y aparecieron seis variantes; van siempre estos dos:
   * - `sectionHeading`: pantallas de CONTENIDO (las subpantallas del caballo).
   * - `sectionEyebrow`: listas tipo Ajustes de iOS (Más, Perfil, Mi plan).
   */
  sectionHeading: { fontSize: text.md, fontWeight: weight.bold, color: c.text, letterSpacing: -0.3 },
  sectionEyebrow: {
    fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint,
    textTransform: 'uppercase' as const, letterSpacing: 1,
  },
  bodyLg: { fontSize: text.md, color: c.textMuted, lineHeight: 24 },
  body: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },
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
export const makeCard = (c: ThemeColors) => {
  // En oscuro la sombra no se ve: la jerarquía la da el contraste de surface
  // sobre bg, así que no la pintamos y ahorramos el costo de render.
  const lift = c.isDark ? {} : shadow.md;
  const liftHi = c.isDark ? {} : shadow.lg;
  return StyleSheet.create({
    base: { backgroundColor: c.surface, borderRadius: radius.card, ...lift },
    padded: { backgroundColor: c.surface, borderRadius: radius.card, padding: space[4], ...lift },
    overflow: {
      backgroundColor: c.surface,
      borderRadius: radius.card,
      overflow: 'hidden' as const,
      ...lift,
    },
    /** La única tarjeta que puede levantar más en una pantalla: el dato hero. */
    hero: { backgroundColor: c.surface, borderRadius: radius.card, padding: space[4], ...liftHi },
  });
};

export const makeInput = (c: ThemeColors) => {
  // Relleno sin borde visible; el 2 transparente evita el salto de layout
  // cuando el foco pinta el borde verde.
  const field = {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.field,
    paddingHorizontal: space[4],
    fontSize: text.md,
    color: c.text,
    backgroundColor: c.surfaceAlt,
  };
  return StyleSheet.create({
    base: { ...field, height: touch.field },
    /** Igual que `base` pero para el campo enfocado. */
    focused: { borderColor: c.brand },
    multiline: {
      ...field,
      paddingVertical: space[4],
      minHeight: 104,
      textAlignVertical: 'top' as const,
    },
  });
};

export const makeButton = (c: ThemeColors) => {
  const shape = {
    height: touch.button,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  return StyleSheet.create({
    // La sombra teñida es lo que lo despega del crema. En oscuro no va: sobre
    // fondo casi negro una sombra verde se lee como un halo sucio.
    primary: {
      ...shape,
      backgroundColor: c.brand,
      borderRadius: radius.button,
      ...(c.isDark ? {} : brandShadow(c.brand)),
    },
    secondary: { ...shape, backgroundColor: c.surfaceAlt, borderRadius: radius.button },
    /** Destructivo sin borde: el rojo sutil de fondo ya avisa. */
    danger: { ...shape, backgroundColor: c.dangerSoft, borderRadius: radius.button },
    primaryText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white, letterSpacing: -0.2 },
    secondaryText: { fontSize: text.md, fontWeight: weight.semibold, color: c.text, letterSpacing: -0.2 },
    dangerText: { fontSize: text.md, fontWeight: weight.semibold, color: c.danger },
  });
};

export const makeModal = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
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

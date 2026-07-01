/**
 * Avatar unificado — identidad visual consistente de personas en toda la app.
 *
 * - Con `avatarUrl` → foto redonda (`<Image>`).
 * - Sin foto → iniciales (1-2 letras) en blanco sobre el color del usuario.
 *   El color usa `avatarColor(name, avatarColor)`: color ELEGIDO del usuario
 *   (`avatar_color`) o, si no eligió, un tono determinístico derivado del nombre
 *   (mismo hash que web → paridad).
 *
 * Theme-aware: el aro (borde) usa el color de superficie del tema.
 * Paridad con `frontend` (misma paleta y hash en `lib/avatar-color`).
 */
import { View, Text, Image, StyleSheet, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { avatarColor, initialsOf } from '../lib/avatar-color';
import { useTheme } from '../lib/theme';
import { colors } from '../lib/colors';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<AvatarSize, number> = {
  xs: 24,
  sm: 30,
  md: 38,
  lg: 48,
  xl: 68,
};

export type AvatarProps = {
  /** Nombre de la persona (para iniciales + color determinístico). */
  name?: string | null;
  /** URL de foto de perfil. Si existe, se muestra la foto. */
  avatarUrl?: string | null;
  /** Color elegido por el usuario (`avatar_color`). Si no, se deriva del nombre. */
  avatarColor?: string | null;
  /** Tamaño: token (`xs|sm|md|lg|xl`) o número de px. Default `md`. */
  size?: AvatarSize | number;
  /** Muestra un aro sutil alrededor (útil sobre fotos/fondos). */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({
  name,
  avatarUrl,
  avatarColor: color,
  size = 'md',
  ring = false,
  style,
}: AvatarProps) {
  const { c } = useTheme();
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const radius = px / 2;

  const ringStyle: ViewStyle = ring
    ? { borderWidth: Math.max(1, Math.round(px * 0.035)), borderColor: c.surface }
    : {};

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[
          { width: px, height: px, borderRadius: radius, backgroundColor: c.surfaceAlt },
          ringStyle,
          style,
        ] as StyleProp<ImageStyle>}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          width: px,
          height: px,
          borderRadius: radius,
          backgroundColor: avatarColor(name, color),
        },
        ringStyle,
        style,
      ]}
    >
      <Text
        style={[styles.text, { fontSize: Math.round(px * 0.4) }]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center' },
  text: { color: colors.white, fontWeight: '700', letterSpacing: 0.2 },
});

export default Avatar;

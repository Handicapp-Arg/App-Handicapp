import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { CloudOff } from 'lucide-react-native';
import { useSinConexion } from '../lib/network';
import { useTheme, type ThemeColors } from '../lib/theme';
import { text, space, radius, weight } from '../styles/tokens';

/**
 * Aviso de "sin conexión" fijo abajo. Aparece solo cuando corresponde y no tapa
 * la navegación: el usuario tiene que entender que la app no está rota, sino
 * que el teléfono se quedó sin señal.
 */
export function OfflineBanner() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const sinConexion = useSinConexion();
  const s = useMemo(() => makeStyles(c), [c]);

  if (!sinConexion) return null;

  return (
    <Animated.View
      style={[s.wrap, { bottom: insets.bottom + 76 }]}
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel="Sin conexión a internet"
    >
      <View style={s.pill}>
        <CloudOff size={15} color={c.warning} strokeWidth={2.2} />
        <Text style={s.texto}>Sin conexión</Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingHorizontal: space[4], paddingVertical: space[2] + 2,
    borderRadius: radius.full,
    backgroundColor: c.surface,
    ...(c.isDark ? {} : {
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14, shadowRadius: 16, elevation: 6,
    }),
  },
  texto: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
});

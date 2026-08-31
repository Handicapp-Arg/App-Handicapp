import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import { useTheme } from '../lib/theme';
import { HorseshoeH } from './icons/equine';

/**
 * Pantalla de entrada: el isotipo de marca aparece con un spring sutil y el
 * wordmark, sobre el fondo del tema (claro u oscuro). Se sostiene un instante
 * y se desvanece. Coherente con el login.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  // La marca arranca VISIBLE: este overlay reemplaza al splash nativo, y si el
  // logo empezara en opacidad 0 se vería un flash en blanco entre uno y otro
  // (logo → vacío → logo de nuevo). También va sin spring: el rebote quedó
  // prohibido en toda la app y acá era lo primero que se veía al abrir.
  const brandOpacity = useSharedValue(1);
  const brandScale = useSharedValue(1);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    // Un respiro corto y se desvanece; la app ya está lista detrás.
    rootOpacity.value = withDelay(
      450,
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, []);

  const brandStyle = useAnimatedStyle(() => ({
    opacity: brandOpacity.value,
    transform: [{ scale: brandScale.value }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  return (
    <Animated.View style={[styles.root, rootStyle, { backgroundColor: c.bg }]} pointerEvents="none">
      <Animated.View style={[styles.brand, brandStyle]}>
        <HorseshoeH size={58} strokeWidth={1.8} color={c.brand} />
        <Text style={[styles.wordmark, { color: c.text }]}>HandicApp</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  brand: { alignItems: 'center', gap: 14 },
  wordmark: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
});

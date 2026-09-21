import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import { HorseshoeH } from './icons/equine';
import { AUTH_DARK } from './auth-dark';

/**
 * Pantalla de entrada. Va SIEMPRE en el oscuro de la marca, sin seguir el tema:
 * es el tercer eslabón de una cadena que tiene que verse continua — ícono de la
 * app, splash nativo y esta pantalla. Cuando seguía el tema, en modo claro el
 * fondo negro del splash nativo saltaba a crema de golpe.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
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
    <Animated.View style={[styles.root, rootStyle]} pointerEvents="none">
      <Animated.View style={[styles.brand, brandStyle]}>
        <HorseshoeH size={96} strokeWidth={1.8} color={AUTH_DARK.text} />
        <Text style={styles.wordmark}>HandicApp</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_DARK.bgMid,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  brand: { alignItems: 'center', gap: 14 },
  wordmark: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: AUTH_DARK.text },
});

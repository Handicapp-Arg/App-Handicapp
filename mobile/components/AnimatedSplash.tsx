import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, runOnJS, Easing,
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
  const brandOpacity = useSharedValue(0);
  const brandScale = useSharedValue(0.82);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    brandOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    brandScale.value = withSpring(1, { damping: 11, stiffness: 90, mass: 0.7 });
    rootOpacity.value = withDelay(
      1250,
      withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
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

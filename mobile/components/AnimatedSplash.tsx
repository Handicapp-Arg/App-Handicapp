import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, runOnJS, Easing,
} from 'react-native-reanimated';
import { colors } from '../lib/colors';

const LOGO = 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png';

/**
 * Pantalla de entrada: el logo de marca aparece con un spring sutil sobre fondo espresso,
 * sostiene un instante y se desvanece. Estilo "splash" moderno (tipo MercadoPago, sobrio).
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const rootOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 11, stiffness: 90, mass: 0.7 });
    // Sostiene ~1s y se va con fade
    rootOpacity.value = withDelay(
      1250,
      withTiming(0, { duration: 420, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  return (
    <Animated.View style={[styles.root, rootStyle]} pointerEvents="none">
      <Animated.Image
        source={{ uri: LOGO }}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gray900,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  logo: { width: 200, height: 90 },
});

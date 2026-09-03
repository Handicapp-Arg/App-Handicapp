import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { HorseshoeH } from './icons/equine';

/**
 * El mundo visual de las pantallas de auth: SIEMPRE oscuro de marca, sin
 * importar el tema. Cierra la cadena ícono → splash → login/registro en un
 * solo lenguaje (patrón Spotify/Uber). Fuente única: si se ajusta un tono,
 * cambia en las tres pantallas a la vez.
 */
export const AUTH_DARK = {
  bgTop: '#1a191b',
  bgBottom: '#0b0b0c',
  text: '#f5f2ed',
  textMuted: '#a69e94',
  textFaint: '#7c746a',
  field: 'rgba(255,255,255,0.07)',
  fieldFocus: 'rgba(255,255,255,0.11)',
  brand: '#c69456',
  danger: '#f0938a',
  dangerBg: 'rgba(239,68,68,0.16)',
} as const;

/** Fondo del mundo auth: gradiente negro + grano de película + status bar clara. */
export function AuthDarkBackground() {
  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={[AUTH_DARK.bgTop, AUTH_DARK.bgBottom]}
        style={StyleSheet.absoluteFill}
      />
      {/* Grano casi invisible: el negro deja de ser plancha y toma materia. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
        <Image
          source={require('../assets/grain.png')}
          style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
          resizeMode="repeat"
        />
      </View>
    </>
  );
}

/** Isotipo blanco con respiración sutil (pulso de ~5s, apenas perceptible). */
export function BrandMark({ size = 116 }: { size?: number }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.035, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, []);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={st}>
      <HorseshoeH size={size} color="#ffffff" />
    </Animated.View>
  );
}

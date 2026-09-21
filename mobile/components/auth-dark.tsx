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
  // Tres paradas y no dos: es la "luz de arriba" del ícono de la app, el mismo
  // fondo que eligió el diseño. Con dos el negro queda plano y anónimo.
  bgTop: '#2f2c26',
  bgMid: '#15140f',
  bgBottom: '#0a0907',
  text: '#f3f0e9',
  textMuted: '#8f8879',
  textFaint: '#6b655a',
  field: 'rgba(255,255,255,0.07)',
  fieldFocus: 'rgba(255,255,255,0.11)',
  // El verde profundo de la marca no se lee sobre este fondo: sobre oscuro va
  // el claro, igual que en el tema de noche.
  brand: '#5fc08f',
  danger: '#e8836d',
  dangerBg: 'rgba(232,131,109,0.16)',
  success: '#78d6a6',
  successBg: 'rgba(120,214,166,0.16)',
} as const;

/** Fondo del mundo auth: la luz de arriba del ícono + grano + status bar clara. */
export function AuthDarkBackground() {
  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={[AUTH_DARK.bgTop, AUTH_DARK.bgMid, AUTH_DARK.bgBottom]}
        locations={[0, 0.55, 1]}
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

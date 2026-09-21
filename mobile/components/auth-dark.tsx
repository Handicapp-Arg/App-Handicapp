import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
  bg: '#100f0c',
  surface: '#1c1a16',
  text: '#f3f0e9',
  textMuted: '#8f8879',
  textFaint: '#6b655a',
  field: 'rgba(255,255,255,0.07)',
  fieldFocus: 'rgba(255,255,255,0.11)',
  /**
   * Verde claro: para TEXTO e íconos verdes sobre el fondo negro. El verde
   * profundo de la marca no se lee ahí, igual que en el tema de noche.
   */
  brand: '#5fc08f',
  /**
   * Verde profundo: para el RELLENO del botón principal, que lleva texto
   * blanco encima. Blanco sobre el verde claro casi no contrasta; sobre este
   * sí. Son dos usos distintos del mismo color, no un capricho.
   */
  brandSolid: '#17715a',
  danger: '#e8836d',
  dangerBg: 'rgba(232,131,109,0.16)',
  success: '#78d6a6',
  successBg: 'rgba(120,214,166,0.16)',
} as const;

/**
 * Fondo del mundo auth: negro de marca liso y status bar clara.
 *
 * Liso a propósito. Antes llevaba un degradado y una textura de grano: el
 * degradado es del ÍCONO de la app, no de esta pantalla, y el grano se pintaba
 * con `resizeMode="repeat"`, que en iOS no repite — dibujaba el mosaico una
 * sola vez y se veía un cuadrado claro arriba a la izquierda. La maqueta pide
 * un fondo plano, que además es lo que deja respirar al contenido.
 */
export function AuthDarkBackground() {
  return (
    <>
      <StatusBar style="light" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: AUTH_DARK.bg }]} />
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

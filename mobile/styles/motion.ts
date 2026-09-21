/**
 * Sistema de motion central — paridad con frontend/lib/motion.ts.
 * Tres duraciones, tres easings. Usar SIEMPRE estos valores en
 * Reanimated `withTiming`, `Animated.timing` o transiciones de layout.
 */

// El Easing viene de Reanimated, no de react-native: `withTiming` corre en el
// hilo de UI y rechaza cualquier curva que no sea un worklet. Ojo si alguna vez
// se usa con el `Animated` clásico: esto devuelve una fábrica, no una función.
import { Easing } from 'react-native-reanimated';

export const duration = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/** Bezier matchea cubic-bezier(x1, y1, x2, y2) usado en CSS web. */
export const easing = {
  outQuart:  Easing.bezier(0.25, 1, 0.5, 1),
  outExpo:   Easing.bezier(0.16, 1, 0.3, 1),
  inOutCirc: Easing.bezier(0.85, 0, 0.15, 1),
} as const;

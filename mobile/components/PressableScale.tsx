import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { duration, easing } from '../styles/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Cuánto se "hunde" al tocar. 0.94 es la medida del sistema. */
  scaleTo?: number;
};

/**
 * Botón/tarjeta que se hunde al tocar. Es lo que hace que un elemento se sienta
 * físico en vez de dibujado.
 *
 * Va con `withTiming` y no con resorte a propósito: el rebote de un spring hace
 * que la tarjeta "pique" al soltarla, y la regla del sistema es salida suave y
 * sin rebote. Baja rápido (el dedo ya está apoyado) y vuelve más lento.
 */
export function PressableScale({ children, style, scaleTo = 0.94, ...props }: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: duration.fast, easing: easing.outQuart });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: duration.base, easing: easing.outQuart });
      }}
      style={[style, animStyle]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

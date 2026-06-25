import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Cuánto se "hunde" al tocar (0.97 default). */
  scaleTo?: number;
};

/**
 * Botón/tarjeta con micro-interacción: se hunde levemente al tocar (spring suave).
 * Reemplazo moderno de TouchableOpacity para tarjetas y acciones principales.
 */
export function PressableScale({ children, style, scaleTo = 0.97, ...props }: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(scaleTo, { damping: 15, stiffness: 320 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 320 }); }}
      style={[style, animStyle]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

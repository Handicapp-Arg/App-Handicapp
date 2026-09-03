import { useEffect, useState } from 'react';
import { StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence,
  Easing, runOnJS,
} from 'react-native-reanimated';
import { AUTH_DARK as D } from './auth-dark';
import { HorseshoeH } from './icons/equine';

/**
 * Cortina de ingreso: el logo girando vive POR ENCIMA de la navegación, así el
 * cambio login → Home ocurre por debajo y la cortina se desvanece revelando la
 * app ya acomodada. Sin esto, el overlay moría con la pantalla de login y la
 * entrada era un corte seco.
 */
let listener: ((visible: boolean) => void) | null = null;

export function mostrarCortina() { listener?.(true); }
export function ocultarCortina() { listener?.(false); }

export function IngresoCurtain() {
  const [montada, setMontada] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    listener = (visible) => {
      if (visible) {
        setMontada(true);
        opacity.value = withTiming(1, { duration: 180 });
        scale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
            withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        );
        spin.value = 0;
        // Giro "hacia adentro": el isotipo rota sobre su eje vertical como una
        // moneda, con perspectiva 3D — distinto del trompo tipico.
        spin.value = withRepeat(withTiming(360, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1);
      } else {
        // Desvanecer suave revelando lo que ya está debajo (el Home).
        opacity.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) }, (fin) => {
          if (fin) runOnJS(setMontada)(false);
        });
      }
    };
    return () => { listener = null; };
  }, []);

  const rootStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { scale: scale.value },
      { rotateY: `${spin.value}deg` },
    ],
  }));

  if (!montada) return null;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        rootStyle,
        { backgroundColor: D.bgBottom, alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
      ]}
      pointerEvents="auto"
    >
      <Animated.View style={logoStyle}>
        <HorseshoeH size={104} color="#ffffff" />
      </Animated.View>
      <Image
        source={require('../assets/wordmark-blanco.png')}
        style={{ width: 196, height: 28, marginTop: 20, resizeMode: 'contain' }}
        accessibilityElementsHidden
      />
    </Animated.View>
  );
}

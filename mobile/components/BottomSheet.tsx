import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn, FadeOut, SlideInDown, SlideOutDown, Easing,
  useSharedValue, useAnimatedStyle, withTiming, runOnJS, useReducedMotion, clamp,
} from 'react-native-reanimated';
import { useTheme, type ThemeColors } from '../lib/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Arrastre de la hoja: arranca en su alto natural (el del contenido) y se
 * puede expandir a casi pantalla completa deslizando hacia arriba desde el
 * grabber o el header, y cerrar deslizando hacia abajo (respeta velocidad).
 *
 * Se comparte entre BottomSheet y FormSheet: ambos miden su alto natural con
 * `onLayout` la primera vez, y desde ahí controlan el alto con un shared
 * value en vez de dejarlo en `auto` — el valor inicial es el mismo, así que
 * no hay salto visual al pasar de uno a otro.
 */
export function useDragToExpand(onClose: () => void) {
  const insets = useSafeAreaInsets();
  const { height: winHeight } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0 : 260;

  const fullHeight = Math.max(winHeight - insets.top - 16, 100);

  const naturalHeight = useSharedValue(0);
  const height = useSharedValue(0);
  const measured = useSharedValue(false);
  const startHeight = useSharedValue(0);
  const overlayBoost = useSharedValue(0);

  const onLayoutSheet = (e: { nativeEvent: { layout: { height: number } } }) => {
    if (measured.value) return;
    const h = e.nativeEvent.layout.height;
    naturalHeight.value = h;
    height.value = h;
    measured.value = true;
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startHeight.value = height.value;
    })
    .onUpdate((e) => {
      const max = Math.max(fullHeight, naturalHeight.value);
      const min = naturalHeight.value * 0.6;
      height.value = clamp(startHeight.value - e.translationY, min, max);
      const span = Math.max(max - naturalHeight.value, 1);
      overlayBoost.value = clamp((height.value - naturalHeight.value) / span, 0, 1);
    })
    .onEnd((e) => {
      const max = Math.max(fullHeight, naturalHeight.value);
      const closingThreshold = naturalHeight.value * 0.72;
      const fastDown = e.velocityY > 900;
      const fastUp = e.velocityY < -900;

      if (!fastUp && (fastDown || height.value < closingThreshold)) {
        overlayBoost.value = withTiming(0, { duration });
        runOnJS(onClose)();
        return;
      }

      const mid = (naturalHeight.value + max) / 2;
      const expand = fastUp || height.value > mid;
      const target = expand ? max : naturalHeight.value;
      height.value = withTiming(target, { duration, easing: Easing.out(Easing.cubic) });
      overlayBoost.value = withTiming(expand ? 1 : 0, { duration });
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: measured.value ? height.value : undefined,
  }));

  const animatedOverlayBoostStyle = useAnimatedStyle(() => ({
    opacity: overlayBoost.value * 0.32,
  }));

  return { pan, onLayoutSheet, animatedSheetStyle, animatedOverlayBoostStyle };
}

/**
 * Hoja inferior estándar de la app.
 *
 * El `Modal` de React Native con `animationType="slide"` desliza TODO el
 * contenido —fondo oscuro incluido—, así que la pantalla no se atenúa: sube un
 * rectángulo negro. Acá separamos las dos animaciones como hacen las apps
 * nativas: el fondo entra con fade y sólo la hoja desliza.
 *
 * El desmontaje se difiere para que se vea la animación de salida, que el
 * Modal cortaría de golpe al pasar `visible` a false.
 *
 * Además es arrastrable: deslizando desde el grabber o el título se expande
 * a casi pantalla completa, o se cierra si el arrastre es hacia abajo y
 * pasa el umbral (o es un flick rápido).
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  avoidKeyboard = false,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Para hojas con inputs: levanta la hoja por encima del teclado. */
  avoidKeyboard?: boolean;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const [montado, setMontado] = useState(visible);
  const { pan, onLayoutSheet, animatedSheetStyle, animatedOverlayBoostStyle } = useDragToExpand(onClose);

  useEffect(() => {
    if (visible) { setMontado(true); return; }
    const t = setTimeout(() => setMontado(false), 240);
    return () => clearTimeout(t);
  }, [visible]);

  if (!montado) return null;

  const Contenedor = avoidKeyboard ? KeyboardAvoidingView : View;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <Contenedor
          style={s.root}
          {...(avoidKeyboard && Platform.OS === 'ios' ? { behavior: 'padding' as const } : {})}
        >
          <AnimatedPressable
            style={s.overlay}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(180)}
            onPress={onClose}
          />
          <Animated.View style={[s.overlayBoost, animatedOverlayBoostStyle]} pointerEvents="none" />
          <Animated.View
            style={[s.sheet, { paddingBottom: insets.bottom + 20 }, animatedSheetStyle]}
            entering={SlideInDown.duration(280).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.cubic))}
            onLayout={onLayoutSheet}
          >
            <GestureDetector gesture={pan}>
              <View style={s.dragArea}>
                <View style={s.grabber} />
                {title ? <Text style={s.title}>{title}</Text> : null}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </Contenedor>
      ) : null}
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: c.overlay },
  overlayBoost: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 16, paddingTop: 10,
    gap: 8,
    borderTopWidth: 1, borderColor: c.border,
    overflow: 'hidden',
  },
  dragArea: { marginBottom: 8 },
  grabber: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: c.borderStrong, alignSelf: 'center', marginBottom: 8,
  },
  title: {
    fontSize: 17, fontWeight: '800', color: c.text,
    marginBottom: 4, paddingHorizontal: 4, letterSpacing: -0.3,
  },
});

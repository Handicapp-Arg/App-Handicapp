import { useEffect, useState, useMemo, type ReactNode } from 'react';
import {
  View, Text, Modal, Pressable, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, Easing } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { haptic } from '../lib/haptics';
import { useTheme, type ThemeColors } from '../lib/theme';
import { useDragToExpand } from './BottomSheet';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Hoja de formulario: header fijo con título y cierre, cuerpo scrolleable y
 * footer opcional para las acciones.
 *
 * Comparte el comportamiento del BottomSheet —overlay con fade, hoja que
 * desliza en ambos sentidos, arrastre para expandir/cerrar— pero pensada para
 * contenido largo con inputs.
 *
 * El arrastre solo funciona desde el grabber y el header (no desde el
 * cuerpo): el formulario tiene un `ScrollView` con campos tocables, y si el
 * gesto capturara toda la hoja no se podría ni scrollear ni tocar un campo.
 */
export function FormSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  /** Alto máximo de la hoja, como fracción de la pantalla. */
  maxHeight = '92%',
  scrollEnabled = true,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: `${number}%`;
  /** Apagarlo mientras un hijo captura el gesto (ej.: el canvas de firma). */
  scrollEnabled?: boolean;
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

  const cerrar = () => { haptic.light(); onClose(); };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible ? (
        <KeyboardAvoidingView
          style={s.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <AnimatedPressable
            style={s.overlay}
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(180)}
            onPress={cerrar}
          />
          <Animated.View style={[s.overlayBoost, animatedOverlayBoostStyle]} pointerEvents="none" />
          <Animated.View
            style={[s.sheet, { maxHeight: maxHeight as unknown as number }, animatedSheetStyle]}
            entering={SlideInDown.duration(280).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.cubic))}
            onLayout={onLayoutSheet}
          >
            <View>
              {/*
                El botón de cerrar queda deliberadamente FUERA del
                GestureDetector: si el pan envolviera también el botón, el
                reconocedor de gestos podría demorar o robarle el tap al
                Pressable nativo. Se posiciona absoluto para no perder su
                lugar en el header.
              */}
              <GestureDetector gesture={pan}>
                <View>
                  <View style={s.grabber} />
                  <View style={s.header}>
                    <Text style={s.title} numberOfLines={1}>{title}</Text>
                    <View style={s.closeBtnSpacer} />
                  </View>
                </View>
              </GestureDetector>
              <Pressable onPress={cerrar} hitSlop={10} style={s.closeBtn}>
                <X size={20} color={c.textMuted} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={[
                s.body,
                !footer && { paddingBottom: insets.bottom + 20 },
              ]}
              scrollEnabled={scrollEnabled}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
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
    paddingTop: 10,
    overflow: 'hidden',
  },
  grabber: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: c.borderStrong, alignSelf: 'center', marginBottom: 6,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  closeBtnSpacer: { width: 32, height: 32 },
  closeBtn: {
    position: 'absolute', top: 14, right: 20,
    width: 32, height: 32, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  body: { paddingHorizontal: 20, paddingBottom: 8, gap: 14 },
  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: c.border,
  },
});

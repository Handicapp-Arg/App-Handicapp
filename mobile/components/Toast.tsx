import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, shadow } from '../styles/tokens';
import { fontFamily } from '../styles/fonts';

/**
 * Sistema de avisos NO intrusivos (toasts). Banner animado que baja desde
 * arriba, con variantes success / error / info, auto-dismiss (~2.5s) y
 * theme-aware. Para CONFIRMACIONES seguí usando `Alert.alert` nativo.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Caballo guardado');
 *   toast.error('No se pudo guardar');
 */

type Variant = 'success' | 'error' | 'info';
type ToastItem = { id: number; message: string; variant: Variant };

type ToastApi = {
  show: (message: string, variant?: Variant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const AUTO_DISMISS_MS = 2500;
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info } as const;

const ToastContext = createContext<ToastApi | null>(null);

function accentFor(variant: Variant, c: ThemeColors): string {
  if (variant === 'success') return c.isDark ? '#22c55e' : '#16a34a';
  if (variant === 'error') return c.isDark ? '#f87171' : '#dc2626';
  return c.brand;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback((message: string, variant: Variant = 'info') => {
    if (!message) return;
    if (timer.current) clearTimeout(timer.current);
    const id = idRef.current + 1;
    idRef.current = id;
    setToast({ id, message, variant });
    timer.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
    info: (m) => show(m, 'info'),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && <ToastView key={toast.id} item={toast} onDismiss={dismiss} />}
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const accent = accentFor(item.variant, c);
  const Icon = ICONS[item.variant];

  return (
    <View style={[s.wrap, { top: insets.top + space[2] }]} pointerEvents="box-none">
      <Animated.View entering={SlideInUp.springify().damping(22).stiffness(220)} exiting={SlideOutUp.duration(220)}>
        <Pressable onPress={onDismiss} style={[s.card, { borderLeftColor: accent }]}>
          <Icon size={20} color={accent} strokeWidth={2.4} />
          <Text style={s.message} numberOfLines={3}>{item.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback seguro: nunca rompas la UI si el provider no está montado.
    return { show: () => {}, success: () => {}, error: () => {}, info: () => {} };
  }
  return ctx;
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    maxWidth: 460,
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderStrong,
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[4],
    ...shadow.lg,
  },
  message: {
    flex: 1,
    fontSize: text.sm,
    fontFamily: fontFamily.semibold,
    fontWeight: weight.semibold,
    color: c.text,
    lineHeight: 19,
  },
});

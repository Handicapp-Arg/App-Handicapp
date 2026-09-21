import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '../lib/theme';
import { space, text, radius, weight } from '../styles/tokens';
import { duration } from '../styles/motion';
import { haptic } from '../lib/haptics';

/**
 * Avisos no intrusivos. Suben desde abajo, se quedan tres segundos y se van.
 *
 * Suben desde abajo y no bajan desde arriba porque el pulgar está abajo: si el
 * aviso trae un "Deshacer", tiene que estar donde la mano ya está. Y van por
 * encima de la barra de pestañas para no taparla.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Gasto guardado');
 *   toast.success('Gasto guardado', { label: 'Deshacer', onPress: revertir });
 */

type Variant = 'success' | 'error' | 'info';
type Accion = { label: string; onPress: () => void };
type ToastItem = { id: number; message: string; variant: Variant; accion?: Accion };

type ToastApi = {
  show: (message: string, variant?: Variant, accion?: Accion) => void;
  success: (message: string, accion?: Accion) => void;
  error: (message: string, accion?: Accion) => void;
  info: (message: string, accion?: Accion) => void;
};

const AUTO_DISMISS_MS = 3000;
/** Alto de la barra flotante más su respiro: el aviso nunca la tapa. */
const ALTO_BARRA = 84;
const ICONS = { success: Check, error: AlertCircle, info: Info } as const;

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback((message: string, variant: Variant = 'info', accion?: Accion) => {
    if (!message) return;
    if (timer.current) clearTimeout(timer.current);
    const id = idRef.current + 1;
    idRef.current = id;
    setToast({ id, message, variant, accion });
    timer.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
  }, []);

  const api = useMemo<ToastApi>(() => ({
    show,
    success: (m, a) => show(m, 'success', a),
    error: (m, a) => show(m, 'error', a),
    info: (m, a) => show(m, 'info', a),
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
  const s = useMemo(() => makeStyles(), []);
  const Icon = ICONS[item.variant];
  // Sobre el fondo casi negro del aviso, el verde profundo no se lee.
  const acento = item.variant === 'error' ? '#F09A85' : '#78D6A6';

  return (
    <View style={[s.wrap, { bottom: insets.bottom + ALTO_BARRA }]} pointerEvents="box-none">
      <Animated.View
        entering={SlideInDown.duration(duration.enter).easing(Easing.out(Easing.cubic))}
        exiting={SlideOutDown.duration(duration.base).easing(Easing.out(Easing.cubic))}
      >
        <Pressable
          onPress={onDismiss}
          style={s.card}
          accessibilityRole="alert"
          accessibilityLabel={item.message}
        >
          <Icon size={18} color={acento} strokeWidth={2.4} />
          <Text style={s.message} numberOfLines={2}>{item.message}</Text>
          {item.accion ? (
            <Pressable
              onPress={() => { haptic.light(); item.accion?.onPress(); onDismiss(); }}
              hitSlop={HIT_ACCION}
              accessibilityRole="button"
              accessibilityLabel={item.accion.label}
            >
              <Text style={[s.accion, { color: acento }]}>{item.accion.label}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

/** El "Deshacer" es texto chico; el hitSlop le da el área táctil que necesita. */
const HIT_ACCION = { top: 12, bottom: 12, left: 12, right: 12 };

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback seguro: nunca rompas la UI si el provider no está montado.
    return { show: () => {}, success: () => {}, error: () => {}, info: () => {} };
  }
  return ctx;
}

// El aviso es oscuro en los dos temas: es una capa que flota sobre la app, no
// una superficie de la app, y cambiarle el color según el tema lo hacía
// desaparecer sobre el fondo en modo noche.
const makeStyles = () => StyleSheet.create({
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
    gap: space[3] - 1,
    maxWidth: 460,
    width: '100%',
    backgroundColor: '#15140f',
    borderRadius: radius.button,
    paddingVertical: space[3] + 2,
    paddingHorizontal: space[4],
    shadowColor: '#15140f',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 10,
  },
  message: {
    flex: 1,
    fontSize: text.base - 1,
    fontWeight: weight.medium,
    color: '#fbfaf7',
    lineHeight: 21,
  },
  accion: {
    fontSize: text.sm,
    fontWeight: weight.semibold,
  },
});

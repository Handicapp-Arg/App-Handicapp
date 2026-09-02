import { useRef, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  type SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { text, weight } from '../styles/tokens';
import { fontFamily } from '../styles/fonts';

const ANCHO_ACCION = 76;

export type SwipeAction = {
  label: string;
  /** Ícono de lucide-react-native. */
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  /** Color de fondo del botón (semántico: c.success, c.danger, c.info, ...). */
  color: string;
  onPress: () => void;
  accessibilityLabel?: string;
};

/**
 * Wrapper reutilizable para deslizar una fila y revelar acciones, como en
 * cualquier lista nativa de iOS (Mail, Mensajes). Envuelve `children` con
 * `ReanimatedSwipeable` — el componente moderno de gesture-handler, ya que
 * el `Swipeable` clásico está deprecado — y muestra `acciones` a la derecha
 * al deslizar hacia la izquierda.
 *
 * No pelea con el scroll vertical del FlatList ni con el tap de la fila:
 * eso lo maneja gesture-handler internamente.
 */
export function SwipeableRow({
  children,
  acciones,
}: {
  children: React.ReactNode;
  acciones: SwipeAction[];
}) {
  const ref = useRef<SwipeableMethods>(null);

  if (acciones.length === 0) return <>{children}</>;

  const renderRightActions = (progress: SharedValue<number>) => (
    <View style={styles.accionesWrap}>
      {acciones.map((accion, i) => (
        <BotonAccion
          key={i}
          accion={accion}
          progress={progress}
          index={i}
          total={acciones.length}
          onEjecutar={() => {
            haptic.selection();
            accion.onPress();
            ref.current?.close();
          }}
        />
      ))}
    </View>
  );

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={2}
      overshootRight={false}
      rightThreshold={40}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => haptic.selection()}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

function BotonAccion({
  accion,
  progress,
  index,
  total,
  onEjecutar,
}: {
  accion: SwipeAction;
  progress: SharedValue<number>;
  index: number;
  total: number;
  onEjecutar: () => void;
}) {
  const { label, Icon, color, accessibilityLabel } = accion;

  // Entra deslizando desde la derecha, en cascada según su posición.
  const animatedStyle = useAnimatedStyle(() => {
    const desde = (total - index) * ANCHO_ACCION;
    const translateX = interpolate(progress.value, [0, 1], [desde, 0]);
    return { transform: [{ translateX }] };
  });

  return (
    <Animated.View style={[styles.accionBtn, { backgroundColor: color }, animatedStyle]}>
      <Pressable
        style={styles.accionPressable}
        onPress={onEjecutar}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        <Icon size={20} color="#fff" strokeWidth={2.25} />
        <Text style={styles.accionLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  accionesWrap: {
    flexDirection: 'row',
  },
  accionBtn: {
    width: ANCHO_ACCION,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accionPressable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  accionLabel: {
    fontSize: text.xs,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    color: '#fff',
  },
});

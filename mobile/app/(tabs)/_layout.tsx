import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ListPlus, CalendarClock } from 'lucide-react-native';
import { HorseHeadNav } from '../../components/icons/equine';
import { useEffect, useMemo, type ComponentType } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { weight } from '../../styles/tokens';
import { duration, easing } from '../../styles/motion';

/**
 * Medidas de la barra, tal cual la maqueta: una píldora oscura flotante donde
 * la pestaña activa se ensancha para mostrar su nombre y el resto queda en
 * ícono suelto. Los anchos son fijos a propósito: así la posición de la
 * pastilla se calcula sin medir el layout y la animación nunca titila.
 */
const TAB_W = 56;
const TAB_ACTIVA_W = 122;
const BARRA_PAD = 8;

/** La barra es oscura en ambos temas, así que sus colores no salen del theme. */
const BARRA_FONDO = '#15140f';
const BARRA_ACTIVO = '#FBFAF7';
const BARRA_APAGADO = '#8A857C';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const TABS: Record<string, { Icon: IconType; label: string }> = {
  caballos: { Icon: HorseHeadNav,  label: 'Caballos' },
  eventos:  { Icon: CalendarClock, label: 'Eventos' },
  agenda:   { Icon: Calendar,      label: 'Agenda' },
  mas:      { Icon: ListPlus,      label: 'Más' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const { user } = useAuth();
  const isProp = user?.role === 'propietario';
  const styles = useMemo(() => makeStyles(c), [c]);
  const activeName = state.routes[state.index]?.name;

  // Las pestañas visibles dependen del rol, así que la posición del indicador
  // se calcula sobre esta lista y no sobre `state.index` (que cuenta todas).
  const visibles = useMemo(
    () => ['caballos', isProp && 'eventos', 'agenda', 'mas'].filter(Boolean) as string[],
    [isProp],
  );
  const activo = Math.max(0, visibles.indexOf(activeName));

  // Todas las pestañas a la izquierda de la activa están en su ancho angosto,
  // así que la pastilla arranca en un múltiplo exacto del paso.
  const x = useSharedValue(activo * TAB_W);
  useEffect(() => {
    x.value = withTiming(activo * TAB_W, { duration: duration.base, easing: easing.outExpo });
  }, [activo, x]);
  const indicador = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  // Patron nativo (hidesBottomBarWhenPushed): dentro de una pantalla empujada
  // (formulario, detalle) la barra se oculta y el pie de la pantalla queda libre.
  const nested = (state.routes[state.index] as any)?.state;
  const enPantallaInterna = !!nested && typeof nested.index === 'number' && nested.index > 0;

  // Se oculta con opacidad, no desmontándose: al destruir la barra se destruía
  // también su fondo y sus cuatro iconos, y volver a construirlos en mitad de
  // la transición de 280 ms era un tirón en cada navegación.
  const oculta = useSharedValue(enPantallaInterna ? 1 : 0);
  useEffect(() => {
    oculta.value = withTiming(enPantallaInterna ? 1 : 0, {
      duration: duration.base,
      easing: easing.outQuart,
    });
  }, [enPantallaInterna, oculta]);
  const barra = useAnimatedStyle(() => ({
    opacity: 1 - oculta.value,
    transform: [{ translateY: oculta.value * 96 }],
  }));


  const renderTab = (name: string) => {
    const meta = TABS[name];
    if (!meta) return null;
    const focused = activeName === name;
    const Icon = meta.Icon;
    const onPress = () => {
      haptic.selection();
      const route = state.routes.find((r) => r.name === name);
      if (!route) return;
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(name as never);
    };
    return (
      <TouchableOpacity
        key={name}
        style={focused ? styles.tabActiva : styles.tab}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityLabel={meta.label}
        accessibilityState={{ selected: focused }}
      >
        <Icon size={21} color={focused ? BARRA_ACTIVO : BARRA_APAGADO} strokeWidth={1.9} />
        {/* El nombre solo acompaña a la pestaña activa: cuatro rótulos
            permanentes llenaban la barra de texto sin agregar información. */}
        {focused ? <Text style={styles.label} numberOfLines={1}>{meta.label}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View
      style={[styles.wrap, { bottom: insets.bottom + 10 }, barra]}
      pointerEvents={enPantallaInterna ? 'none' : 'box-none'}
    >
      <View style={styles.bar}>
        {/* Fondo sólido y no BlurView: encima del vidrio ya iba un velo casi
            opaco, así que el desenfoque no se veía, pero se pagaba en cada
            frame de scroll y se recreaba en cada navegación. */}
        <View style={[StyleSheet.absoluteFill, styles.barGlass]} />
        {/* Pastilla que se desliza hasta la pestaña activa. Va detrás de los
            iconos y no intercepta toques. */}
        <Animated.View style={[styles.indicador, indicador]} pointerEvents="none" />
        {visibles.map(renderTab)}
      </View>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: c.bg } }}
    >
      <Tabs.Screen name="muro" />
      <Tabs.Screen name="caballos" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="mas" />
      <Tabs.Screen name="perfil"      options={{ href: null }} />
      <Tabs.Screen name="index"       options={{ href: null }} />
      <Tabs.Screen name="eventos"     options={{ href: null }} />
      <Tabs.Screen name="facturacion" options={{ href: null }} />
      <Tabs.Screen name="remates"     options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="directorio"     options={{ href: null }} />
      <Tabs.Screen name="contratos"      options={{ href: null }} />
      <Tabs.Screen name="mi-plan"        options={{ href: null }} />
      <Tabs.Screen name="reportes"       options={{ href: null }} />
    </Tabs>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: BARRA_PAD,
    height: 64,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#15140f',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 32,
    elevation: 10,
  },
  barGlass: { backgroundColor: BARRA_FONDO },
  indicador: {
    position: 'absolute',
    left: BARRA_PAD,
    top: BARRA_PAD,
    width: TAB_ACTIVA_W,
    height: 48,
    borderRadius: 18,
    backgroundColor: 'rgba(251,250,247,0.14)',
  },
  tab: {
    width: TAB_W,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActiva: {
    width: TAB_ACTIVA_W,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: weight.semibold,
    color: BARRA_ACTIVO,
    letterSpacing: -0.1,
  },
});

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

import { BlurView } from 'expo-blur';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { weight, radius } from '../../styles/tokens';
import { duration, easing } from '../../styles/motion';

/** Ancho de cada pestaña; el indicador se mueve de a este paso. */
const TAB_W = 72;

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

  const x = useSharedValue(activo * TAB_W);
  useEffect(() => {
    x.value = withTiming(activo * TAB_W, { duration: duration.base, easing: easing.outExpo });
  }, [activo, x]);
  const indicador = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  // Patron nativo (hidesBottomBarWhenPushed): dentro de una pantalla empujada
  // (formulario, detalle) la barra se oculta y el pie de la pantalla queda libre.
  const nested = (state.routes[state.index] as any)?.state;
  const enPantallaInterna = !!nested && typeof nested.index === 'number' && nested.index > 0;


  const renderTab = (name: string) => {
    const meta = TABS[name];
    if (!meta) return null;
    const focused = activeName === name;
    const Icon = meta.Icon;
    const color = focused ? c.brand : c.textMuted;
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
        style={styles.tab}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityLabel={meta.label}
        accessibilityState={{ selected: focused }}
      >
        <Icon size={24} color={color} strokeWidth={focused ? 2.1 : 1.5} />
        <Text style={[styles.label, { color, fontWeight: focused ? weight.bold : weight.semibold }]}>{meta.label}</Text>
      </TouchableOpacity>
    );
  };

  if (enPantallaInterna) return null;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {/* Vidrio esmerilado de fondo, estilo pildora flotante de iOS. */}
        <BlurView
          intensity={88}
          tint={c.isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.barGlass]}
        />
        {/* Pastilla que se desliza hasta la pestaña activa. Va detrás de los
            iconos y no intercepta toques. */}
        <Animated.View style={[styles.indicador, indicador]} pointerEvents="none" />
        {visibles.map(renderTab)}
      </View>
    </View>
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
    paddingHorizontal: 10,
    height: 62,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: c.isDark ? 0.28 : 0.09,
    shadowRadius: 22,
    elevation: 8,
  },
  barGlass: {
    // El blur pone el vidrio; este velo le da el tinte de la superficie.
    backgroundColor: c.isDark ? 'rgba(29,26,23,0.55)' : 'rgba(255,255,255,0.55)',
  },
  indicador: {
    position: 'absolute',
    left: 10,
    top: 7,
    width: TAB_W,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: c.brandSoft,
  },
  tab: {
    width: TAB_W,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontSize: 11, letterSpacing: 0.1 },
});

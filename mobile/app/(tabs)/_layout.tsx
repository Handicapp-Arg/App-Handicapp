import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ListPlus, CalendarClock } from 'lucide-react-native';
import { HorseHeadNav } from '../../components/icons/equine';
import { useMemo, type ComponentType } from 'react';

import { BlurView } from 'expo-blur';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { weight } from '../../styles/tokens';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const TABS: Record<string, { Icon: IconType; label: string }> = {
  'caballos/index': { Icon: HorseHeadNav,  label: 'Caballos' },
  eventos:          { Icon: CalendarClock, label: 'Eventos' },
  agenda:           { Icon: Calendar,      label: 'Agenda' },
  mas:              { Icon: ListPlus,      label: 'Más' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const { user } = useAuth();
  const isProp = user?.role === 'propietario';
  const styles = useMemo(() => makeStyles(c), [c]);
  const activeName = state.routes[state.index]?.name;


  const renderTab = (name: string) => {
    const meta = TABS[name];
    if (!meta) return null;
    const focused = activeName === name;
    const Icon = meta.Icon;
    const color = focused ? c.brand : (c.isDark ? '#8a8177' : '#57534e');
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

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 10 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {/* Vidrio esmerilado de fondo, estilo pildora flotante de iOS. */}
        <BlurView
          intensity={88}
          tint={c.isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.barGlass]}
        />
        {renderTab('caballos/index')}
        {isProp && renderTab('eventos')}
        {renderTab('agenda')}
        {renderTab('mas')}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: c.bg } }}
    >
      <Tabs.Screen name="muro" />
      <Tabs.Screen name="caballos/index" />
      <Tabs.Screen name="agenda" />
      <Tabs.Screen name="mas" />
      <Tabs.Screen name="perfil"        options={{ href: null }} />
      <Tabs.Screen name="index"         options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/index"       options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/historial"   options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/sanidad"     options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/finanzas"    options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/fotos"       options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/equipo"      options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/documentos"  options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/rutina"      options={{ href: null }} />
      <Tabs.Screen name="caballos/[id]/pedigree"    options={{ href: null }} />
      <Tabs.Screen name="eventos"       options={{ href: null }} />
      <Tabs.Screen name="facturacion"   options={{ href: null }} />
      <Tabs.Screen name="remates/index" options={{ href: null }} />
      <Tabs.Screen name="remates/crear" options={{ href: null }} />
      <Tabs.Screen name="remates/[id]"  options={{ href: null }} />
      <Tabs.Screen name="notificaciones" options={{ href: null }} />
      <Tabs.Screen name="directorio"     options={{ href: null }} />
      <Tabs.Screen name="contratos"      options={{ href: null }} />
      <Tabs.Screen name="arbol"          options={{ href: null }} />
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
  tab: {
    width: 72,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: { fontSize: 11, letterSpacing: 0.1 },
});

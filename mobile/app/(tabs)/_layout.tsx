import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ListPlus, QrCode, CalendarClock } from 'lucide-react-native';
import { useMemo, type ComponentType } from 'react';
import { HorseHeadNav, BrandIsotipo } from '../../components/icons/equine';
import { BlurView } from 'expo-blur';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { weight } from '../../styles/tokens';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const TABS: Record<string, { Icon: IconType; label: string }> = {
  muro:             { Icon: BrandIsotipo, label: 'Muro' },
  'caballos/index': { Icon: HorseHeadNav, label: 'Caballos' },
  eventos:          { Icon: CalendarClock, label: 'Eventos' },
  agenda:           { Icon: Calendar,     label: 'Agenda' },
  mas:              { Icon: ListPlus,     label: 'Más' },
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
        <Icon size={24} color={color} strokeWidth={focused ? 2.4 : 2} />
        <Text style={[styles.label, { color, fontWeight: focused ? weight.bold : weight.semibold }]}>{meta.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.bar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
      {/* Vidrio esmerilado de fondo; el botón central sobresale sin recorte. */}
      <BlurView
        intensity={82}
        tint={c.isDark ? 'dark' : 'light'}
        style={[StyleSheet.absoluteFill, styles.barGlass]}
      />
      {isProp ? renderTab('caballos/index') : renderTab('muro')}
      {isProp ? renderTab('eventos') : renderTab('caballos/index')}
      <View style={styles.qrSlot} />
      {renderTab('agenda')}
      {renderTab('mas')}

      {/* Botón central: sobrio. Home (isotipo) para propietario, escáner QR para el resto. */}
      <TouchableOpacity
        style={[styles.centerBtn, { bottom: insets.bottom + 16 }]}
        activeOpacity={0.85}
        onPress={() => { haptic.light(); router.push(isProp ? '/muro' : '/escanear'); }}
        accessibilityRole="button"
        accessibilityLabel={isProp ? 'Ir al inicio' : 'Escanear código QR'}
      >
        {isProp
          ? <BrandIsotipo size={30} color={colors.white} />
          : <QrCode size={24} color={colors.white} strokeWidth={2.2} />}
      </TouchableOpacity>
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
      <Tabs.Screen name="caballos/[id]" options={{ href: null }} />
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
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: 8,
  },
  barGlass: {
    // El blur pone el vidrio; este velo le da el tinte de la superficie.
    backgroundColor: c.isDark ? 'rgba(29,26,23,0.72)' : 'rgba(255,255,255,0.72)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    position: 'relative',
  },
  label: { fontSize: 11, letterSpacing: 0.1 },
  qrSlot: { width: 70 },
  centerBtn: {
    position: 'absolute',
    left: '50%',
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.brand,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
});

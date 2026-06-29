import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ListPlus, QrCode } from 'lucide-react-native';
import { useMemo, type ComponentType } from 'react';
import { HorseHeadIcon, BrandIsotipo } from '../../components/icons/equine';
import { haptic } from '../../lib/haptics';
import { useTheme, type ThemeColors } from '../../lib/theme';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const TABS: Record<string, { Icon: IconType; label: string }> = {
  muro:             { Icon: BrandIsotipo, label: 'Muro' },
  'caballos/index': { Icon: HorseHeadIcon, label: 'Caballos' },
  agenda:           { Icon: Calendar,     label: 'Agenda' },
  mas:              { Icon: ListPlus,     label: 'Más' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const activeName = state.routes[state.index]?.name;

  const renderTab = (name: string) => {
    const meta = TABS[name];
    if (!meta) return null;
    const focused = activeName === name;
    const Icon = meta.Icon;
    const color = focused ? c.brand : c.textMuted;
    const onPress = () => {
      haptic.light();
      const route = state.routes.find((r) => r.name === name);
      if (!route) return;
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(name as never);
    };
    return (
      <TouchableOpacity key={name} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
        {focused && <View style={styles.activeBar} />}
        <Icon size={23} color={color} strokeWidth={focused ? 2.6 : 2} />
        <Text style={[styles.label, { color }]}>{meta.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.bar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
      {renderTab('muro')}
      {renderTab('caballos/index')}
      <View style={styles.qrSlot} />
      {renderTab('agenda')}
      {renderTab('mas')}

      {/* Botón QR central que sobresale */}
      <TouchableOpacity
        style={[styles.qrBtn, { bottom: insets.bottom + 24 }]}
        activeOpacity={0.85}
        onPress={() => { haptic.light(); router.push('/buscar'); }}
      >
        <QrCode size={24} color={c.isDark ? '#1a1207' : '#ffffff'} strokeWidth={2.4} />
      </TouchableOpacity>
      <Text style={[styles.qrLabel, { bottom: insets.bottom + 6 }]}>QR</Text>
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
    </Tabs>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    elevation: 14,
    shadowColor: '#0f1f3d',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    position: 'relative',
  },
  activeBar: {
    position: 'absolute',
    top: -10,
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.brand,
  },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.1 },
  qrSlot: { width: 70 },
  qrBtn: {
    position: 'absolute',
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: c.brand,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: c.surface,
    elevation: 7,
    shadowColor: c.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: c.isDark ? 0.22 : 0.3,
    shadowRadius: 7,
  },
  qrLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: c.brand,
  },
});

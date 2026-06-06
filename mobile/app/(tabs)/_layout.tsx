import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/colors';
import { useNotifications } from '../../lib/notifications';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const SAFE_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName; label: string }> = {
  index:           { active: 'home',           inactive: 'home-outline',          label: 'Inicio' },
  muro:            { active: 'newspaper',      inactive: 'newspaper-outline',     label: 'Muro' },
  'caballos/index': { active: 'paw',           inactive: 'paw-outline',           label: 'Caballos' },
  remates:         { active: 'trophy',         inactive: 'trophy-outline',        label: 'Remates' },
  mas:             { active: 'grid',           inactive: 'grid-outline',          label: 'Más' },
};

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const meta = SAFE_ICONS[name] ?? SAFE_ICONS.index;
  return (
    <View style={styles.iconWrap}>
      {/* Pill de fondo activo */}
      {focused && <View style={styles.activePill} />}
      <Ionicons
        name={focused ? meta.active : meta.inactive}
        size={22}
        color={focused ? colors.primary : '#94a3b8'}
      />
      {badge != null && badge > 0 && (
        <View style={styles.badgeDot} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { unread } = useNotifications();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          paddingBottom: insets.bottom + 2,
          paddingTop: 8,
          height: 60 + insets.bottom,
          elevation: 0,
          shadowColor: '#0f1f3d',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          ...Platform.select({
            ios: {
              borderTopColor: 'transparent',
            },
            android: {
              borderTopWidth: 1,
              borderTopColor: '#e2e8f0',
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
          letterSpacing: 0.1,
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon
            name={route.name}
            focused={focused}
            badge={route.name === 'perfil' ? unread : undefined}
          />
        ),
      })}
    >
      <Tabs.Screen name="index"          options={{ title: 'Inicio' }} />
      <Tabs.Screen name="muro"           options={{ title: 'Muro' }} />
      <Tabs.Screen name="caballos/index" options={{ title: 'Caballos' }} />
      <Tabs.Screen name="remates"        options={{ title: 'Remates' }} />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 9, minWidth: 14, height: 14 },
        }}
      />
      <Tabs.Screen name="caballos/[id]" options={{ href: null }} />
      <Tabs.Screen name="eventos"        options={{ href: null }} />
      <Tabs.Screen name="facturacion"    options={{ href: null }} />
      <Tabs.Screen name="perfil"         options={{ href: null }} />
      <Tabs.Screen name="agenda"         options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 32,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    width: 36,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 31, 61, 0.08)',
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});

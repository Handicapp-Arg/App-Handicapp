import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/colors';
import { useNotifications } from '../../lib/notifications';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: Record<string, { active: IoniconsName; inactive: IoniconsName; label: string; color: string }> = {
  index:            { active: 'home',         inactive: 'home-outline',        label: 'Inicio',   color: colors.primary },
  'caballos/index': { active: 'paw',          inactive: 'paw-outline',         label: 'Caballos', color: '#059669' },
  agenda:           { active: 'calendar',     inactive: 'calendar-outline',    label: 'Agenda',   color: '#0284c7' },
  muro:             { active: 'newspaper',    inactive: 'newspaper-outline',   label: 'Muro',     color: '#7c3aed' },
  mas:              { active: 'grid',         inactive: 'grid-outline',        label: 'Más',      color: '#374151' },
};

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const meta = TABS[name] ?? TABS.index;
  const iconColor = focused ? meta.color : '#94a3b8';

  return (
    <View style={styles.wrap}>
      {focused && (
        <View style={[styles.activePill, { backgroundColor: meta.color + '14' }]} />
      )}
      <Ionicons
        name={focused ? meta.active : meta.inactive}
        size={focused ? 23 : 22}
        color={iconColor}
      />
      {badge != null && badge > 0 && (
        <View style={styles.badgeDot}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { unread } = useNotifications();

  return (
    <Tabs
      screenOptions={({ route }) => {
        const meta = TABS[route.name] ?? TABS.index;
        return {
          headerShown: false,
          tabBarActiveTintColor: meta.color,
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 0,
            paddingBottom: insets.bottom + 2,
            paddingTop: 8,
            height: 62 + insets.bottom,
            elevation: 0,
            shadowColor: '#0f1f3d',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.07,
            shadowRadius: 20,
            ...Platform.select({
              android: {
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
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
            <TabIcon name={route.name} focused={focused} badge={route.name === 'mas' ? unread : undefined} />
          ),
        };
      }}
    >
      <Tabs.Screen name="index"          options={{ title: 'Inicio' }} />
      <Tabs.Screen name="caballos/index" options={{ title: 'Caballos' }} />
      <Tabs.Screen name="agenda"         options={{ title: 'Agenda' }} />
      <Tabs.Screen name="muro"           options={{ title: 'Muro' }} />
      <Tabs.Screen name="mas"            options={{ title: 'Más',
        tabBarBadge: unread > 0 ? unread : undefined,
        tabBarBadgeStyle: { backgroundColor: '#ef4444', fontSize: 9, minWidth: 15, height: 15 },
      }} />
      <Tabs.Screen name="caballos/[id]"  options={{ href: null }} />
      <Tabs.Screen name="eventos"        options={{ href: null }} />
      <Tabs.Screen name="facturacion"    options={{ href: null }} />
      <Tabs.Screen name="remates"        options={{ href: null }} />
      <Tabs.Screen name="perfil"         options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activePill: {
    position: 'absolute',
    width: 40,
    height: 30,
    borderRadius: 12,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 10,
  },
});

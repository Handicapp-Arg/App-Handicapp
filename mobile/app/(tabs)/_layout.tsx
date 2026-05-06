import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/colors';
import { useNotifications } from '../../lib/notifications';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const SAFE_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  index:       { active: 'home',           inactive: 'home-outline' },
  caballos:    { active: 'paw',            inactive: 'paw-outline' },
  eventos:     { active: 'document-text',  inactive: 'document-text-outline' },
  agenda:      { active: 'calendar',       inactive: 'calendar-outline' },
  facturacion: { active: 'receipt',        inactive: 'receipt-outline' },
  perfil:      { active: 'person-circle',  inactive: 'person-circle-outline' },
};

function TabIcon({ name, focused, badge }: { name: string; focused: boolean; badge?: number }) {
  const icons = SAFE_ICONS[name] ?? SAFE_ICONS.index;
  return (
    <View style={styles.iconWrap}>
      <Ionicons
        name={focused ? icons.active : icons.inactive}
        size={24}
        color={focused ? colors.primary : colors.gray400}
      />
      {badge != null && badge > 0 && (
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray200,
          borderTopWidth: 1,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
          height: 56 + insets.bottom,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.2,
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
      <Tabs.Screen name="index"       options={{ title: 'Inicio' }} />
      <Tabs.Screen name="caballos"    options={{ title: 'Caballos' }} />
      <Tabs.Screen name="eventos"     options={{ title: 'Eventos' }} />
      <Tabs.Screen name="agenda"      options={{ title: 'Agenda' }} />
      <Tabs.Screen name="facturacion" options={{ title: 'Facturación' }} />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.red500, fontSize: 10, minWidth: 16, height: 16 },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: 0, right: 0 },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red500, borderWidth: 1.5, borderColor: colors.white },
});

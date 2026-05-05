import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../lib/colors';
import { useNotifications } from '../../lib/notifications';

function TabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      {children}
    </View>
  );
}

// SVG paths como texto no funciona en RN puro, usamos emojis Unicode simples
// (se reemplazarán por @expo/vector-icons si se instala luego)
const icons: Record<string, string> = {
  index: '⊞',
  caballos: '▲',
  eventos: '◎',
  perfil: '◉',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { unread } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray200,
          paddingBottom: insets.bottom,
          height: 56 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: -2 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="caballos" options={{ title: 'Caballos' }} />
      <Tabs.Screen name="eventos" options={{ title: 'Eventos' }} />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.red500, fontSize: 10 },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  iconWrapActive: { backgroundColor: `${colors.primary}15` },
});

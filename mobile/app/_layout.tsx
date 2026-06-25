import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, Platform } from 'react-native';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '../lib/auth';
import { NotificationsProvider } from '../lib/notifications';
import { colors } from '../lib/colors';
import { StatusBar } from 'expo-status-bar';

// Quita el contorno negro de foco de los inputs en la versión web (no afecta al celular real).
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const STYLE_ID = 'rnw-focus-fix';
  if (!document.getElementById(STYLE_ID)) {
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = 'input,textarea,select,[contenteditable]{outline:none !important;}';
    document.head.appendChild(el);
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function InnerLayout() {
  const { user } = useAuth();
  return (
    <NotificationsProvider userId={user?.id}>
      <Stack screenOptions={{ headerShown: false }} />
    </NotificationsProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AuthProvider>
          <InnerLayout />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

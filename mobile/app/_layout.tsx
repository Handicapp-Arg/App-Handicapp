import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { useState, useEffect } from 'react';

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
import { StatusBar } from 'expo-status-bar';
import { AnimatedSplash } from '../components/AnimatedSplash';
import { ThemeProvider, useTheme } from '../lib/theme';

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
  const { c } = useTheme();
  return (
    <NotificationsProvider userId={user?.id}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </NotificationsProvider>
  );
}

function ThemedStatusBar() {
  const { scheme, c } = useTheme();

  // En web: pinta el fondo del documento y los scrollbars del navegador según el
  // tema, para que el rebote/overscroll y las barras de scroll no se vean claras
  // sobre el fondo oscuro. Reacciona al cambiar de tema.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const STYLE_ID = 'theme-chrome';
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = `
      html, body { background-color: ${c.bg}; }
      * { scrollbar-width: thin; scrollbar-color: ${c.borderStrong} ${c.bg}; }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: ${c.bg}; }
      ::-webkit-scrollbar-thumb { background: ${c.borderStrong}; border-radius: 5px; border: 2px solid ${c.bg}; }
    `;
  }, [scheme, c]);

  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ThemedStatusBar />
          {fontsLoaded && (
            <AuthProvider>
              <InnerLayout />
            </AuthProvider>
          )}
          {showSplash && <AnimatedSplash onDone={() => setShowSplash(false)} />}
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';
import { Platform, Text, TextInput } from 'react-native';
import { useState, useEffect } from 'react';

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  });
}
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { configurarRed } from '../lib/network';

// El splash nativo se queda hasta que la app está lista (fuentes cargadas).
// Antes había DOS pantallas de marca —la nativa y un overlay animado con otro
// dibujo del logo— y el salto entre ambas se veía como una transición rara.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Accesibilidad: la app acompaña el tamaño de letra del sistema, con un tope
// (1.35x) para que los tamaños extremos no rompan filas y botones fijos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Text as any).defaultProps = { ...(Text as any).defaultProps, maxFontSizeMultiplier: 1.35 };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(TextInput as any).defaultProps = { ...(TextInput as any).defaultProps, maxFontSizeMultiplier: 1.35 };
SplashScreen.setOptions({ duration: 320, fade: true });
import { OfflineBanner } from '../components/OfflineBanner';
import { IngresoCurtain } from '../components/IngresoCurtain';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AuthProvider, useAuth } from '../lib/auth';
import { NotificationsProvider } from '../lib/notifications';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../lib/theme';
import { ToastProvider } from '../components/Toast';

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
  defaultOptions: {
    queries: {
      // Con señal intermitente, un solo reintento inmediato casi nunca alcanza.
      retry: 2,
      retryDelay: (intento) => Math.min(1000 * 2 ** intento, 8000),
      staleTime: 30_000,
      refetchOnReconnect: true,
    },
  },
});

function InnerLayout() {
  const { user } = useAuth();
  const { c } = useTheme();
  return (
    <ToastProvider>
      <NotificationsProvider userId={user?.id}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
            // Transición nativa de iOS: la pantalla entra desde la derecha y la
            // anterior se desplaza detrás. Habilita además el gesto de volver
            // deslizando desde el borde, que en iOS se espera que exista.
            animation: 'slide_from_right',
            gestureEnabled: true,
            animationDuration: 280,
          }}
        >
          <Stack.Screen name="peon" />
          <Stack.Screen name="jinete" />
          <Stack.Screen name="supervision" />
        </Stack>
      </NotificationsProvider>
    </ToastProvider>
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
  useEffect(() => configurarRed(), []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SafeAreaProvider>
            <ThemedStatusBar />
            {fontsLoaded && (
              <AuthProvider>
                <InnerLayout />
              </AuthProvider>
            )}
            {fontsLoaded && <OfflineBanner />}
            <IngresoCurtain />
          </SafeAreaProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

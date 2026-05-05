import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { NotificationsProvider } from '../lib/notifications';

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
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <InnerLayout />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

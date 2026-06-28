import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../lib/theme';

export default function AuthLayout() {
  const { scheme } = useTheme();
  return (
    <>
      {/* Status bar acorde al tema (las pantallas de auth ya son claras/oscuras) */}
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Transición deslizante entre login / registro / recuperar contraseña */}
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </>
  );
}

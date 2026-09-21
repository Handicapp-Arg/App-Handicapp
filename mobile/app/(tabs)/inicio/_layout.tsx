import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

/**
 * Inicio es una pestaña con stack propio (igual que caballos/agenda/muro): hoy
 * solo tiene el índice, pero dejarlo como Stack permite empujar subpantallas
 * más adelante sin romper el patrón de la barra (que se oculta sola cuando el
 * stack anidado pasa del índice).
 */
export default function InicioLayout() {
  const { c } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        animationDuration: 280,
        contentStyle: { backgroundColor: c.bg },
      }}
    />
  );
}

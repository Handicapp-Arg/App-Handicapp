import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function FacturacionLayout() {
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

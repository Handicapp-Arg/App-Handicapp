import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  const { c } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={c.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});

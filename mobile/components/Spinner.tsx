import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../lib/colors';

export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
});

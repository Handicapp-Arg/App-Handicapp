import { Text, View, StyleSheet } from 'react-native';
import { eventTypeColors } from '../lib/colors';

export function EventTypeBadge({ type }: { type: string }) {
  const style = eventTypeColors[type] ?? eventTypeColors.nota;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '600' },
});

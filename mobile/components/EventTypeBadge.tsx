import { Text, View, StyleSheet } from 'react-native';
import { eventTypeColors } from '../lib/colors';
import { useTheme } from '../lib/theme';

export function EventTypeBadge({ type }: { type: string }) {
  const { c } = useTheme();
  const style = eventTypeColors[type] ?? eventTypeColors.nota;
  return (
    <View style={[styles.badge, { backgroundColor: c.isDark ? style.text + '26' : style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 11, fontWeight: '600' },
});

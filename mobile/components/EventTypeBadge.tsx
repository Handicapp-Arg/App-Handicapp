import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';
import { makeEventTypeColors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';

export function EventTypeBadge({ type }: { type: string }) {
  const { c } = useTheme();
  const map = makeEventTypeColors(c);
  const style = map[type] ?? map.nota;
  return (
    <View
      style={[styles.badge, { backgroundColor: style.bg }]}
      accessibilityRole="text"
      accessibilityLabel={`Tipo de evento: ${style.label}`}
    >
      <Text style={[styles.text, { color: style.text }]} allowFontScaling={false}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: text.xs, fontWeight: weight.bold },
});

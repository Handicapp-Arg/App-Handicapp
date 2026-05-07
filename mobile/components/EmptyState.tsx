import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';
import { space, text, weight, radius } from '../styles/tokens';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Color de acento para el ícono */
  tint?: string;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, tint = colors.primary }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: `${tint}15` }]}>
        <Ionicons name={icon} size={32} color={tint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: tint }]} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[8],
    gap: space[3],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space[2],
  },
  title: {
    fontSize: text.base,
    fontWeight: weight.bold,
    color: colors.gray900,
    textAlign: 'center',
  },
  message: {
    fontSize: text.sm,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: space[2],
    borderRadius: radius.md,
    paddingHorizontal: space[6],
    paddingVertical: space[3],
  },
  btnText: {
    fontSize: text.sm,
    fontWeight: weight.bold,
    color: colors.white,
  },
});

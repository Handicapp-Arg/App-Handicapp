import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';
import { space, text, weight, radius } from '../styles/tokens';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  /** Usa fondo primario oscuro en lugar de blanco */
  dark?: boolean;
}

export function ScreenHeader({ title, subtitle, showBack, right, dark = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[
      styles.wrap,
      { paddingTop: insets.top + space[3] },
      dark ? styles.wrapDark : styles.wrapLight,
    ]}>
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons
              name="chevron-back"
              size={22}
              color={dark ? colors.white : colors.gray900}
            />
          </TouchableOpacity>
        )}

        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, dark ? styles.titleDark : styles.titleLight]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, dark ? styles.subtitleDark : styles.subtitleLight]}>
              {subtitle}
            </Text>
          )}
        </View>

        {right && <View style={styles.rightSlot}>{right}</View>}
      </View>
    </View>
  );
}

/** Botón estándar para el slot derecho del header */
export function HeaderButton({
  label,
  onPress,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <TouchableOpacity
      style={[styles.headerBtn, variant === 'ghost' ? styles.headerBtnGhost : styles.headerBtnPrimary]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={variant === 'ghost' ? colors.primary : colors.white}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.headerBtnText, variant === 'ghost' ? styles.headerBtnTextGhost : styles.headerBtnTextPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: space[4],
    paddingBottom: space[3],
    borderBottomWidth: 1,
  },
  wrapLight: {
    backgroundColor: colors.white,
    borderBottomColor: colors.gray100,
  },
  wrapDark: {
    backgroundColor: colors.primary,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -space[1],
  },
  titleBlock: { flex: 1 },
  title: {
    fontSize: text.lg,
    fontWeight: weight.extrabold,
    letterSpacing: -0.3,
  },
  titleLight: { color: colors.gray900 },
  titleDark: { color: colors.white },
  subtitle: { fontSize: text.xs, marginTop: 1 },
  subtitleLight: { color: colors.gray400 },
  subtitleDark: { color: 'rgba(255,255,255,0.55)' },
  rightSlot: { flexShrink: 0 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  headerBtnPrimary: { backgroundColor: colors.primary },
  headerBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gray200 },
  headerBtnText: { fontSize: text.sm, fontWeight: weight.bold },
  headerBtnTextPrimary: { color: colors.white },
  headerBtnTextGhost: { color: colors.primary },
});

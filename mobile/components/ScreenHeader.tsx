import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { colors } from '../lib/colors';
import { space, text, weight, radius } from '../styles/tokens';
import { fontFamily } from '../styles/fonts';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  /** Usa fondo primario oscuro en lugar de blanco */
  dark?: boolean;
  /** Cuando va dentro de un scroll: el contenedor ya aplica el safe-area top */
  scrollable?: boolean;
}

export function ScreenHeader({ title, subtitle, showBack, right, dark = false, scrollable = false }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[
      styles.wrap,
      { paddingTop: scrollable ? space[3] : insets.top + space[3] },
      dark ? styles.wrapDark : styles.wrapLight,
    ]}>
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft
              size={22}
              color={dark ? colors.white : colors.gray900}
              strokeWidth={2}
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
  icon?: LucideIcon;
}) {
  const Icon = icon;
  return (
    <TouchableOpacity
      style={[styles.headerBtn, variant === 'ghost' ? styles.headerBtnGhost : styles.headerBtnPrimary]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {Icon && (
        <Icon
          size={14}
          color={variant === 'ghost' ? colors.brand : colors.white}
          strokeWidth={2}
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
  },
  wrapLight: {
    backgroundColor: 'transparent',
  },
  wrapDark: {
    backgroundColor: colors.espresso,
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
    fontSize: text.xl,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    letterSpacing: -0.3,
  },
  titleLight: { color: colors.gray900 },
  titleDark: { color: colors.white },
  subtitle: { fontSize: text.xs, marginTop: 1, fontFamily: fontFamily.medium },
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
  headerBtnPrimary: { backgroundColor: colors.brand },
  headerBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.gray200 },
  headerBtnText: { fontSize: text.sm, fontWeight: weight.bold, fontFamily: fontFamily.bold },
  headerBtnTextPrimary: { color: colors.white },
  headerBtnTextGhost: { color: colors.brand },
});

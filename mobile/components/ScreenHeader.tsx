import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
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
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  return (
    <View style={[
      s.wrap,
      { paddingTop: scrollable ? space[3] : insets.top + space[3] },
      dark ? s.wrapDark : s.wrapLight,
    ]}>
      <View style={s.row}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ChevronLeft
              size={22}
              color={dark ? colors.white : c.text}
              strokeWidth={2}
            />
          </TouchableOpacity>
        )}

        <View style={s.titleBlock}>
          <Text
            style={[s.title, dark ? s.titleDark : s.titleLight]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={[s.subtitle, dark ? s.subtitleDark : s.subtitleLight]}>
              {subtitle}
            </Text>
          )}
        </View>

        {right && <View style={s.rightSlot}>{right}</View>}
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
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity
      style={[s.headerBtn, variant === 'ghost' ? s.headerBtnGhost : s.headerBtnPrimary]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {Icon && (
        <Icon
          size={14}
          color={variant === 'ghost' ? c.brand : colors.white}
          strokeWidth={2}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[s.headerBtnText, variant === 'ghost' ? s.headerBtnTextGhost : s.headerBtnTextPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: {
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  wrapLight: {
    backgroundColor: 'transparent',
  },
  wrapDark: {
    backgroundColor: colors.gray900,
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
  titleLight: { color: c.text },
  titleDark: { color: colors.white },
  subtitle: { fontSize: text.xs, marginTop: 1, fontFamily: fontFamily.medium },
  subtitleLight: { color: c.textFaint },
  subtitleDark: { color: 'rgba(255,255,255,0.55)' },
  rightSlot: { flexShrink: 0 },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
  },
  headerBtnPrimary: { backgroundColor: c.brand },
  headerBtnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.borderStrong },
  headerBtnText: { fontSize: text.sm, fontWeight: weight.bold, fontFamily: fontFamily.bold },
  headerBtnTextPrimary: { color: colors.white },
  headerBtnTextGhost: { color: c.brand },
});

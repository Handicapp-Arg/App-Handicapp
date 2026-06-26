import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Building2, CloudOff, FileText, Lock, Receipt, Calendar, Stethoscope,
  Newspaper, Search, SlidersHorizontal, Mail, Users, Bell, Trophy, Inbox,
} from 'lucide-react-native';
import { HorseIcon } from './icons/equine';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, weight, radius } from '../styles/tokens';
import { fontFamily } from '../styles/fonts';

type IconComp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const ICON_MAP: Record<string, IconComp> = {
  'business-outline': Building2,
  'cloud-offline-outline': CloudOff,
  'document-text-outline': FileText,
  'lock-closed-outline': Lock,
  'receipt-outline': Receipt,
  'calendar-outline': Calendar,
  'medkit-outline': Stethoscope,
  'newspaper-outline': Newspaper,
  'search-outline': Search,
  'search': Search,
  'filter-outline': SlidersHorizontal,
  'mail-outline': Mail,
  'mail-unread-outline': Mail,
  'people-outline': Users,
  'notifications-outline': Bell,
  'trophy-outline': Trophy,
  'paw-outline': HorseIcon,
  'file-tray-outline': Inbox,
};

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Color de acento para el ícono */
  tint?: string;
}

export function EmptyState({ icon, title, message, actionLabel, onAction, tint }: EmptyStateProps) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const accent = tint ?? c.brand;
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={s.wrap}>
      <View style={[s.iconCircle, { backgroundColor: `${accent}15` }]}>
        {(() => {
          const L = ICON_MAP[icon];
          return L ? <L size={32} color={accent} strokeWidth={2} /> : <Ionicons name={icon} size={32} color={accent} />;
        })()}
      </View>
      <Text style={s.title}>{title}</Text>
      {message && <Text style={s.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={[s.btn, { backgroundColor: accent, shadowColor: accent }]} onPress={onAction} activeOpacity={0.88}>
          <Text style={s.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space[8],
    gap: space[3],
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space[2],
  },
  title: {
    fontSize: text.base,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: c.text,
    textAlign: 'center',
  },
  message: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: space[3],
    borderRadius: radius.full,
    paddingHorizontal: space[6] + 2,
    paddingVertical: space[3] + 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
  btnText: {
    fontSize: text.sm,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
});

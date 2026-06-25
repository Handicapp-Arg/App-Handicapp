import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  Building2, CloudOff, FileText, Lock, Receipt, Calendar, Stethoscope,
  Newspaper, Search, SlidersHorizontal, Mail, Users, Bell, Trophy, Inbox,
} from 'lucide-react-native';
import { HorseIcon } from './icons/equine';
import { colors } from '../lib/colors';
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

export function EmptyState({ icon, title, message, actionLabel, onAction, tint = colors.brand }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: `${tint}15` }]}>
        {(() => {
          const L = ICON_MAP[icon];
          return L ? <L size={32} color={tint} strokeWidth={2} /> : <Ionicons name={icon} size={32} color={tint} />;
        })()}
      </View>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.btn, { backgroundColor: tint }]} onPress={onAction} activeOpacity={0.85}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
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
    fontFamily: fontFamily.bold,
    color: colors.gray900,
    textAlign: 'center',
  },
  message: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
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
    fontFamily: fontFamily.bold,
    color: colors.white,
  },
});

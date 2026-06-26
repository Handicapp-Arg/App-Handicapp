import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  FileText, Receipt, AlertCircle, File, CheckCircle2, XCircle, Home, Trophy,
  Award, Lock, Bell, BellOff, ChevronLeft, Stethoscope, UserPlus,
  Users, ArrowUp, MoreVertical, CheckCheck, type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListRowSkeleton } from '../../components/Skeleton';
import { useNotifications, type NotificationItem } from '../../lib/notifications';
import { clearBadge } from '../../lib/push-notifications';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight } from '../../styles/tokens';
import { fontFamily } from '../../styles/fonts';

/* ─── Tipo → icono + colores ─── */
const TYPE_META: Record<string, { icon: LucideIcon; bg: string; color: string }> = {
  event_created:      { icon: FileText,     bg: '#eff6ff', color: '#3b82f6' },
  health_reminder:    { icon: Stethoscope,  bg: '#fef2f2', color: '#ef4444' },
  billing:            { icon: Receipt,      bg: '#faf3e9', color: '#9d6c35' },
  bill_created:       { icon: Receipt,      bg: '#faf3e9', color: '#9d6c35' },
  bill_disputed:      { icon: AlertCircle,  bg: '#fef9c3', color: '#ca8a04' },
  contract:           { icon: File,         bg: '#ecfdf5', color: '#10b981' },
  contract_signed:    { icon: CheckCircle2, bg: '#ecfdf5', color: '#10b981' },
  contract_rejected:  { icon: XCircle,      bg: '#fef2f2', color: '#ef4444' },
  invitation_received:{ icon: UserPlus,     bg: '#eff6ff', color: '#3b82f6' },
  invitation_accepted:{ icon: Users,        bg: '#ecfdf5', color: '#10b981' },
  boarding_request:   { icon: Home,         bg: '#fff7ed', color: '#f97316' },
  bid_placed:         { icon: Trophy,       bg: '#fff7ed', color: '#f97316' },
  auction_won:        { icon: Award,        bg: '#ecfdf5', color: '#10b981' },
  auction_closed:     { icon: Lock,         bg: '#f3f4f6', color: '#6b7280' },
  auction_outbid:     { icon: ArrowUp,      bg: '#fef2f2', color: '#ef4444' },
  default:            { icon: Bell,         bg: colors.gray100, color: colors.gray500 },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH < 24) return `Hace ${diffH} h`;
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

/* ─── Item ─── */
function NotifRow({
  item,
  onPress,
  c,
  s,
}: {
  item: NotificationItem;
  onPress: (n: NotificationItem) => void;
  c: ThemeColors;
  s: Styles;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.default;
  const MetaIcon = meta.icon;
  const iconBg = c.isDark ? meta.color + '26' : meta.bg;

  return (
    <TouchableOpacity
      style={[s.row, !item.read && s.rowUnread]}
      onPress={() => { haptic.light(); onPress(item); }}
      activeOpacity={0.75}
    >
      {/* Ícono */}
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <MetaIcon size={20} color={meta.color} strokeWidth={2} />
      </View>

      {/* Contenido */}
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.rowTitle, !item.read && s.rowTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <Text style={s.rowMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={s.rowTime}>{formatTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Section label ─── */
function SectionLabel({ label, s }: { label: string; s: Styles }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

/* ─── Main ─── */
export default function NotificacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, loading, unread, refresh, markAllRead, markOneRead } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  // Limpiar badge al abrir la pantalla
  useEffect(() => {
    void clearBadge();
  }, []);

  const unreadList = notifications.filter((n) => !n.read);
  const readList   = notifications.filter((n) =>  n.read).slice(0, 30);

  const handlePress = (n: NotificationItem) => {
    if (!n.read) void markOneRead(n.id);
    if (['bid_placed', 'auction_won', 'auction_closed', 'auction_outbid'].includes(n.type)) {
      router.push('/(tabs)/remates' as never);
    } else if (n.type === 'boarding_request') {
      router.push('/(tabs)/perfil' as never);
    } else if (n.event_id) {
      router.push('/(tabs)/eventos' as never);
    }
  };

  type ListRow =
    | { kind: 'section'; key: string; label: string }
    | { kind: 'item';    key: string; item: NotificationItem };

  const rows: ListRow[] = [];
  if (unreadList.length > 0) {
    rows.push({ kind: 'section', key: 'sec-unread', label: 'Nuevas' });
    unreadList.forEach((n) => rows.push({ kind: 'item', key: n.id, item: n }));
  }
  if (readList.length > 0) {
    rows.push({ kind: 'section', key: 'sec-read', label: 'Anteriores' });
    readList.forEach((n) => rows.push({ kind: 'item', key: n.id, item: n }));
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ─── Header ─── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={c.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notificaciones</Text>
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unread}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => { haptic.light(); setMenuOpen(true); }}
          style={s.menuBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <MoreVertical size={22} color={c.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* ─── Lista ─── */}
      {loading && notifications.length === 0 ? (
        <View style={s.list}>
          {Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <BellOff size={32} color={c.textFaint} strokeWidth={2} />
          </View>
          <Text style={s.emptyTitle}>Sin notificaciones</Text>
          <Text style={s.emptyMsg}>Cuando haya actividad en tus caballos, aparecerá aquí.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={loading}
          renderItem={({ item: row, index }) => {
            if (row.kind === 'section') return <SectionLabel label={row.label} s={s} />;
            return (
              <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                <NotifRow
                  item={row.item}
                  onPress={handlePress}
                  c={c}
                  s={s}
                />
              </Animated.View>
            );
          }}
        />
      )}

      {/* Menú de 3 puntos */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={[s.menu, { top: insets.top + 50 }]}>
            <TouchableOpacity
              style={s.menuItem}
              activeOpacity={0.7}
              onPress={() => { setMenuOpen(false); haptic.medium(); void markAllRead(); }}
            >
              <CheckCheck size={18} color={c.text} strokeWidth={2} />
              <Text style={s.menuItemText}>Marcar todas como leídas</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.bg,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: c.bg,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -space[1],
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginLeft: space[2],
  },
  headerTitle: {
    fontSize: text.lg,
    fontWeight: weight.extrabold,
    fontFamily: fontFamily.extrabold,
    color: c.text,
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: text.xs,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    right: space[4],
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    paddingVertical: space[1],
    minWidth: 230,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  menuItemText: {
    fontSize: text.sm,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    color: c.text,
  },

  /* Lista */
  list: {
    paddingBottom: space[10],
  },

  sectionLabel: {
    fontSize: text.xs,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: c.textFaint,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: space[4],
    paddingTop: space[4],
    paddingBottom: space[2],
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.surface,
    paddingVertical: space[3] + 1,
    paddingHorizontal: space[4],
    gap: space[3],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  rowUnread: {
    backgroundColor: c.isDark ? 'rgba(59,130,246,0.14)' : '#eff6ff',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  rowTitle: {
    flex: 1,
    fontSize: text.sm,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    color: c.textMuted,
    letterSpacing: -0.1,
  },
  rowTitleUnread: {
    color: c.text,
  },
  rowMsg: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: c.textMuted,
    lineHeight: 18,
  },
  rowTime: {
    fontSize: text.xs,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    marginTop: 2,
  },
  /* Empty / Loading */
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[8],
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: c.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: text.md,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: c.text,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
});

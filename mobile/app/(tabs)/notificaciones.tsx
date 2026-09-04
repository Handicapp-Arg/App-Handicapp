import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  FileText, Receipt, AlertCircle, File, CheckCircle2, XCircle, Home, Trophy,
  Award, Lock, Bell, Stethoscope, UserPlus,
  Users, ArrowUp, MoreVertical, CheckCheck, Check, type LucideIcon,
} from 'lucide-react-native';
import { ListRowSkeleton } from '../../components/Skeleton';
import { useNotifications, type NotificationItem } from '../../lib/notifications';
import { clearBadge } from '../../lib/push-notifications';
import { fechaHumana, hace } from '../../lib/fechas';
import { haptic } from '../../lib/haptics';
import { Routes } from '../../lib/routes';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight } from '../../styles/tokens';
import { fontFamily } from '../../styles/fonts';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { ActionSheet } from '../../components/ActionSheet';
import { SwipeableRow } from '../../components/SwipeableRow';

/* ─── Tipo → icono + colores (theme-aware, semánticos) ─── */
const makeTypeMeta = (c: ThemeColors): Record<string, { icon: LucideIcon; bg: string; color: string }> => ({
  event_created:      { icon: FileText,     bg: c.infoSoft,     color: c.info },
  health_reminder:    { icon: Stethoscope,  bg: c.dangerSoft,   color: c.danger },
  billing:            { icon: Receipt,      bg: c.brandSoft,    color: c.brand },
  bill_created:       { icon: Receipt,      bg: c.brandSoft,    color: c.brand },
  bill_disputed:      { icon: AlertCircle,  bg: c.warningSoft,  color: c.warning },
  contract:           { icon: File,         bg: c.infoSoft,     color: c.info },
  contract_signed:    { icon: CheckCircle2, bg: c.successSoft,  color: c.success },
  contract_rejected:  { icon: XCircle,      bg: c.dangerSoft,   color: c.danger },
  invitation_received:{ icon: UserPlus,     bg: c.infoSoft,     color: c.info },
  invitation_accepted:{ icon: Users,        bg: c.successSoft,  color: c.success },
  boarding_request:   { icon: Home,         bg: c.warningSoft,  color: c.warning },
  bid_placed:         { icon: Trophy,       bg: c.infoSoft,     color: c.info },
  auction_won:        { icon: Award,        bg: c.successSoft,  color: c.success },
  auction_closed:     { icon: Lock,         bg: c.surfaceAlt,   color: c.textMuted },
  auction_outbid:     { icon: ArrowUp,      bg: c.dangerSoft,   color: c.danger },
  default:            { icon: Bell,         bg: c.surfaceAlt,   color: c.textMuted },
});

// Tiempo relativo unificado (lib/fechas.ts): "Ahora" para lo instantáneo,
// "hace X" hasta la semana, y fecha corta ("vie 5 sep") más allá.
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Ahora';
  const diffDias = Math.floor(diffMin / 1440);
  if (diffDias >= 7) return fechaHumana(iso);
  return hace(iso);
}

/* ─── Item ─── */
function NotifRow({
  item,
  onPress,
  onMarkRead,
  c,
  s,
}: {
  item: NotificationItem;
  onPress: (n: NotificationItem) => void;
  onMarkRead: (id: string) => void;
  c: ThemeColors;
  s: Styles;
}) {
  const typeMeta = makeTypeMeta(c);
  const meta = typeMeta[item.type] ?? typeMeta.default;
  const MetaIcon = meta.icon;
  const iconBg = meta.bg;

  return (
    <SwipeableRow
      acciones={item.read ? [] : [{
        label: 'Leída',
        Icon: Check,
        color: c.info,
        onPress: () => onMarkRead(item.id),
        accessibilityLabel: 'Marcar como leída',
      }]}
    >
      <TouchableOpacity
        style={s.row}
        onPress={() => { haptic.light(); onPress(item); }}
        activeOpacity={0.75}
      >
        {/* Ícono — en las leídas retrocede (opacidad), para que la atención
            quede en las no leídas */}
        <View style={[s.iconWrap, { backgroundColor: iconBg }, item.read && s.iconWrapRead]}>
          <MetaIcon size={20} color={meta.color} strokeWidth={2} />
        </View>

        {/* Contenido */}
        <View style={s.rowBody}>
          <View style={s.rowTop}>
            {!item.read && <View style={s.unreadDot} />}
            <Text style={[s.rowTitle, !item.read && s.rowTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={s.rowTime}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={[s.rowMsg, item.read && s.rowMsgRead]} numberOfLines={2}>{item.message}</Text>
        </View>
      </TouchableOpacity>
    </SwipeableRow>
  );
}

/* ─── Section label ─── */
function SectionLabel({ label, s }: { label: string; s: Styles }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

/* ─── Main ─── */
export default function NotificacionesScreen() {
  const router = useRouter();
  const { notifications, loading, isError, refresh, markAllRead, markOneRead } = useNotifications();
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
    <View style={s.root}>
      {/* ─── Header ─── */}
      <ScreenHeader
        showBack
        backTo={Routes.mas}
        title="Notificaciones"
        right={
          <TouchableOpacity
            onPress={() => { haptic.light(); setMenuOpen(true); }}
            style={s.menuBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Más opciones"
          >
            <MoreVertical size={22} color={c.text} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      {/* ─── Lista ─── */}
      {loading && notifications.length === 0 ? (
        <View style={s.list}>
          {Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : isError && notifications.length === 0 ? (
        <ErrorState onRetry={() => refresh()} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="Sin notificaciones"
          message="Cuando haya actividad en tus caballos, aparecerá aquí."
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.brand} />
          }
          renderItem={({ item: row, index }) => {
            if (row.kind === 'section') return <SectionLabel label={row.label} s={s} />;
            return (
              <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                <NotifRow
                  item={row.item}
                  onPress={handlePress}
                  onMarkRead={(id) => void markOneRead(id)}
                  c={c}
                  s={s}
                />
              </Animated.View>
            );
          }}
        />
      )}

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        acciones={[{
          label: 'Marcar todas como leídas',
          Icon: CheckCheck,
          onPress: () => { haptic.medium(); void markAllRead(); },
        }]}
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.bg,
  },

  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Lista */
  list: {
    paddingBottom: 120,
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

  /* Row — aplanada, vive directo sobre c.bg; el hairline es el único separador */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space[3] + 3,
    paddingHorizontal: space[4],
    gap: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrapRead: {
    opacity: 0.55,
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
    fontSize: text.base,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    color: c.textMuted,
    letterSpacing: -0.1,
  },
  rowTitleUnread: {
    color: c.text,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: c.brand,
    flexShrink: 0,
  },
  rowMsg: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: c.textMuted,
    lineHeight: 19,
  },
  rowMsgRead: {
    color: c.textFaint,
  },
  rowTime: {
    fontSize: text.xs,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    flexShrink: 0,
  },
});

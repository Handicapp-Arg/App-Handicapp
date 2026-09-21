import { useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  FileText, Receipt, AlertCircle, File, CheckCircle2, XCircle, Home, Trophy,
  Award, Lock, Bell, Stethoscope, UserPlus,
  Users, ArrowUp, Check, type LucideIcon,
} from 'lucide-react-native';
import { Skeleton } from '../../components/Skeleton';
import { useNotifications, type NotificationItem } from '../../lib/notifications';
import { clearBadge } from '../../lib/push-notifications';
import { fechaHumana, hace } from '../../lib/fechas';
import { haptic } from '../../lib/haptics';
import { Routes } from '../../lib/routes';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch } from '../../styles/tokens';
import { entradaFila } from '../../styles/motion';
import { fontFamily } from '../../styles/fonts';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { PressableScale } from '../../components/PressableScale';
import { SwipeableRow } from '../../components/SwipeableRow';

/* ─── Tipo → icono + colores (theme-aware, semánticos) ─── */
const makeTypeMeta = (c: ThemeColors): Record<string, { icon: LucideIcon; bg: string; color: string }> => ({
  event_created:      { icon: FileText,     bg: c.infoSoft,     color: c.info },
  health_reminder:    { icon: Stethoscope,  bg: c.dangerSoft,   color: c.danger },
  billing:            { icon: Receipt,      bg: c.goldSoft,     color: c.goldText },
  bill_created:       { icon: Receipt,      bg: c.goldSoft,     color: c.goldText },
  bill_disputed:      { icon: AlertCircle,  bg: c.dangerSoft,   color: c.danger },
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

/**
 * Fila de aviso. La no leída lleva el texto completo y el punto verde a la
 * derecha; la leída se apaga y muestra solo título y momento: ya no pide nada.
 */
function NotifRow({
  item,
  index,
  onPress,
  onMarkRead,
  c,
  s,
}: {
  item: NotificationItem;
  index: number;
  onPress: (n: NotificationItem) => void;
  onMarkRead: (id: string) => void;
  c: ThemeColors;
  s: Styles;
}) {
  const typeMeta = makeTypeMeta(c);
  const meta = typeMeta[item.type] ?? typeMeta.default;
  const MetaIcon = meta.icon;

  return (
    <Animated.View entering={entradaFila(index)}>
      <SwipeableRow
        acciones={item.read ? [] : [{
          label: 'Leída',
          Icon: Check,
          color: c.info,
          onPress: () => onMarkRead(item.id),
          accessibilityLabel: 'Marcar como leída',
        }]}
      >
        <PressableScale
          style={s.row}
          onPress={() => { haptic.light(); onPress(item); }}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${item.read ? '' : ', sin leer'}`}
        >
          <View style={[s.cajita, { backgroundColor: meta.bg }, item.read && s.cajitaLeida]}>
            <MetaIcon size={20} color={meta.color} strokeWidth={1.9} />
          </View>

          <View style={s.rowBody}>
            <Text style={[s.rowTitle, item.read && s.rowTitleRead]} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && !!item.message && (
              <Text style={s.rowMsg} numberOfLines={2}>{item.message}</Text>
            )}
            <Text style={s.rowTime}>{formatTime(item.created_at)}</Text>
          </View>

          {!item.read && <View style={s.puntoSinLeer} />}
        </PressableScale>
      </SwipeableRow>
    </Animated.View>
  );
}

/* ─── Main ─── */
export default function NotificacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, loading, isError, refresh, markAllRead, markOneRead } = useNotifications();
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
    rows.push({ kind: 'section', key: 'sec-unread', label: 'Sin leer' });
    unreadList.forEach((n) => rows.push({ kind: 'item', key: n.id, item: n }));
  }
  if (readList.length > 0) {
    rows.push({ kind: 'section', key: 'sec-read', label: 'Antes' });
    readList.forEach((n) => rows.push({ kind: 'item', key: n.id, item: n }));
  }

  // Una sola acción no merece un menú de tres puntos: va como texto en el header.
  const header = (
    <ScreenHeader
      scrollable
      showBack
      backTo={Routes.mas}
      title="Avisos"
      right={unreadList.length > 0 ? (
        <PressableScale
          onPress={() => { haptic.medium(); void markAllRead(); }}
          style={s.marcarBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Marcar todos los avisos como leídos"
        >
          <Text style={s.marcarBtnText}>Marcar leídos</Text>
        </PressableScale>
      ) : undefined}
    />
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {loading && notifications.length === 0 ? (
        <View>
          {header}
          {/* Misma silueta que la fila real: cajita + dos líneas + momento. */}
          <View style={s.list}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={s.row}>
                <Skeleton width={42} height={42} borderRadius={radius.thumb} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={15} />
                  <Skeleton width="85%" height={13} />
                  <Skeleton width="30%" height={11} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : isError && notifications.length === 0 ? (
        <View>{header}<ErrorState onRetry={() => refresh()} /></View>
      ) : notifications.length === 0 ? (
        <View>
          {header}
          <EmptyState
            icon="notifications-outline"
            title="Sin avisos"
            message="Cuando haya actividad en tus caballos, aparece acá."
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.brand} colors={[c.brand]} />
          }
          renderItem={({ item: row, index }) => {
            if (row.kind === 'section') return <Text style={s.sectionLabel}>{row.label}</Text>;
            return (
              <NotifRow
                item={row.item}
                index={index}
                onPress={handlePress}
                onMarkRead={(id) => void markOneRead(id)}
                c={c}
                s={s}
              />
            );
          }}
        />
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  marcarBtn: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: space[1] },
  marcarBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: c.brand },

  list: { paddingBottom: 120 },

  sectionLabel: {
    fontSize: text.sm,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    color: c.textFaint,
    paddingHorizontal: space[4],
    paddingTop: space[5],
    paddingBottom: space[1],
  },

  /* Fila aplanada: vive directo sobre c.bg, el hairline es el único separador */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: space[4],
    paddingHorizontal: space[4],
    gap: space[3] + 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.bg,
  },
  cajita: {
    width: 42, height: 42, borderRadius: radius.thumb,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cajitaLeida: { opacity: 0.55 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: text.md,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    color: c.text,
    letterSpacing: -0.1,
  },
  rowTitleRead: { color: c.textMuted, fontWeight: weight.medium, fontFamily: fontFamily.medium },
  rowMsg: {
    fontSize: text.base,
    fontFamily: fontFamily.regular,
    color: c.textMuted,
    lineHeight: 21,
    marginTop: 2,
  },
  rowTime: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    marginTop: space[1] + 1,
  },
  puntoSinLeer: {
    width: 9, height: 9, borderRadius: radius.full,
    backgroundColor: c.brand, marginTop: space[2], flexShrink: 0,
  },
});

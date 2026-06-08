import { useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications, type NotificationItem } from '../lib/notifications';
import { clearBadge } from '../lib/push-notifications';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { space, text, radius, weight, shadow } from '../styles/tokens';
import { fontFamily } from '../styles/fonts';

/* ─── Tipo → icono + colores ─── */
const TYPE_META: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; color: string }> = {
  event_created:      { icon: 'document-text-outline', bg: '#eff6ff', color: '#3b82f6' },
  health_reminder:    { icon: 'medkit-outline',        bg: '#fef2f2', color: '#ef4444' },
  billing:            { icon: 'receipt-outline',       bg: '#f5f3ff', color: '#8b5cf6' },
  bill_created:       { icon: 'receipt-outline',       bg: '#f5f3ff', color: '#8b5cf6' },
  bill_disputed:      { icon: 'alert-circle-outline',  bg: '#fef9c3', color: '#ca8a04' },
  contract:           { icon: 'document-outline',      bg: '#ecfdf5', color: '#10b981' },
  contract_signed:    { icon: 'checkmark-circle-outline', bg: '#ecfdf5', color: '#10b981' },
  contract_rejected:  { icon: 'close-circle-outline',  bg: '#fef2f2', color: '#ef4444' },
  invitation_received:{ icon: 'person-add-outline',    bg: '#eff6ff', color: '#3b82f6' },
  invitation_accepted:{ icon: 'people-outline',        bg: '#ecfdf5', color: '#10b981' },
  boarding_request:   { icon: 'home-outline',          bg: '#fff7ed', color: '#f97316' },
  default:            { icon: 'notifications-outline', bg: colors.gray100, color: colors.gray500 },
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
  onMarkRead,
}: {
  item: NotificationItem;
  onPress: (n: NotificationItem) => void;
  onMarkRead: (id: string) => void;
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META.default;

  return (
    <TouchableOpacity
      style={[s.row, !item.read && s.rowUnread]}
      onPress={() => { haptic.light(); onPress(item); }}
      activeOpacity={0.75}
    >
      {/* Ícono */}
      <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>

      {/* Contenido */}
      <View style={s.rowBody}>
        <View style={s.rowTop}>
          <Text style={[s.rowTitle, !item.read && s.rowTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={s.dot} />}
        </View>
        <Text style={s.rowMsg} numberOfLines={2}>{item.message}</Text>
        <Text style={s.rowTime}>{formatTime(item.created_at)}</Text>
      </View>

      {/* Marcar leída */}
      {!item.read && (
        <TouchableOpacity
          style={s.readBtn}
          onPress={(e) => { e.stopPropagation?.(); haptic.light(); onMarkRead(item.id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark" size={15} color={colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* ─── Section label ─── */
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

/* ─── Main ─── */
export default function NotificacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notifications, loading, unread, refresh, markAllRead, markOneRead } = useNotifications();

  // Limpiar badge al abrir la pantalla
  useEffect(() => {
    void clearBadge();
  }, []);

  const unreadList = notifications.filter((n) => !n.read);
  const readList   = notifications.filter((n) =>  n.read).slice(0, 30);

  const handlePress = (n: NotificationItem) => {
    if (!n.read) void markOneRead(n.id);
    // Navegar según el tipo
    if (n.event_id) {
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
          <Ionicons name="chevron-back" size={22} color={colors.gray900} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notificaciones</Text>
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unread}</Text>
            </View>
          )}
        </View>

        {unread > 0 ? (
          <TouchableOpacity
            onPress={() => { haptic.medium(); void markAllRead(); }}
            activeOpacity={0.7}
          >
            <Text style={s.markAllBtn}>Todas leídas</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {/* ─── Lista ─── */}
      {loading && notifications.length === 0 ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.centered}>
          <View style={s.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={32} color={colors.gray300} />
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
          renderItem={({ item: row }) => {
            if (row.kind === 'section') return <SectionLabel label={row.label} />;
            return (
              <NotifRow
                item={row.item}
                onPress={handlePress}
                onMarkRead={(id) => void markOneRead(id)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.gray50,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
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
    color: colors.gray900,
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
  markAllBtn: {
    fontSize: text.sm,
    fontWeight: weight.semibold,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },

  /* Lista */
  list: {
    padding: space[4],
    gap: space[2],
    paddingBottom: space[10],
  },

  sectionLabel: {
    fontSize: text.xs,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: colors.gray400,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: space[1],
    marginTop: space[2],
    marginBottom: space[1],
  },

  /* Row */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space[3],
    gap: space[3],
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadow.sm,
  },
  rowUnread: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
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
    color: colors.gray500,
    letterSpacing: -0.1,
  },
  rowTitleUnread: {
    color: colors.gray900,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: '#3b82f6',
    flexShrink: 0,
  },
  rowMsg: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray500,
    lineHeight: 18,
  },
  rowTime: {
    fontSize: text.xs,
    fontFamily: fontFamily.regular,
    color: colors.gray300,
    marginTop: 2,
  },
  readBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    alignSelf: 'center',
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
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: text.md,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: colors.gray700,
    textAlign: 'center',
  },
  emptyMsg: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
  },
});

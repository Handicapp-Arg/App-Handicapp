import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ClipboardList, Camera, Dumbbell, Megaphone, AlertTriangle, ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { Avatar } from '../components/Avatar';
import { useEncargadoDashboard, type EncargadoFeedItem } from '../hooks/use-dashboard';
import { useTheme, type ThemeColors } from '../lib/theme';
import { haptic } from '../lib/haptics';
import { Routes, nav } from '../lib/routes';
import { space, text, radius, weight, shadow } from '../styles/tokens';
import { fontFamily } from '../styles/fonts';

const ALERT_COLOR = '#ef4444';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(): string {
  const d = new Date();
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

const KIND_META: Record<EncargadoFeedItem['kind'], { Icon: LucideIcon; label: string }> = {
  rutina:        { Icon: ClipboardList, label: 'Rutina' },
  foto:          { Icon: Camera,        label: 'Foto' },
  entrenamiento: { Icon: Dumbbell,      label: 'Entrenamiento' },
  aviso:         { Icon: Megaphone,     label: 'Aviso' },
};

/** Hora en formato es-AR. Muestra la hora si es de hoy, si no fecha corta. */
function formatAt(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

function StatCard({ value, label, s, alert }: { value: number; label: string; s: Styles; alert?: boolean }) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statValue, alert && value > 0 && s.statValueAlert]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function FeedRow({ item, c, s, onPress }: { item: EncargadoFeedItem; c: ThemeColors; s: Styles; onPress: () => void }) {
  const meta = KIND_META[item.kind] ?? KIND_META.aviso;
  const Icon = item.is_alert ? AlertTriangle : meta.Icon;
  const tint = item.is_alert ? ALERT_COLOR : c.brand;
  return (
    <TouchableOpacity
      style={[s.feedRow, item.is_alert && s.feedRowAlert]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.feedIcon, { backgroundColor: item.is_alert ? `${ALERT_COLOR}18` : c.brandSoft }]}>
        <Icon size={20} color={tint} strokeWidth={2} />
      </View>

      <View style={s.feedBody}>
        <Text style={[s.feedTitle, item.is_alert && { color: ALERT_COLOR }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.detail ? <Text style={s.feedDetail} numberOfLines={2}>{item.detail}</Text> : null}
        <View style={s.feedMeta}>
          <Text style={s.feedHorse} numberOfLines={1}>{item.horse_name}</Text>
          {item.author_name ? (
            <>
              <Text style={s.dot}>·</Text>
              <Avatar name={item.author_name} size="xs" />
              <Text style={s.feedAuthor} numberOfLines={1}>{item.author_name}</Text>
            </>
          ) : null}
          <Text style={s.dot}>·</Text>
          <Text style={s.feedTime}>{formatAt(item.at)}</Text>
        </View>
      </View>

      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={s.thumb} resizeMode="cover" />
      ) : (
        <ChevronRight size={18} color={c.textFaint} strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
}

export default function SupervisionScreen() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useEncargadoDashboard();

  const alerts = useMemo(() => (data?.feed ?? []).filter((f) => f.is_alert), [data]);
  const rest = useMemo(() => (data?.feed ?? []).filter((f) => !f.is_alert), [data]);

  const goHorse = (id: string) => { haptic.light(); nav.push(router, Routes.caballo(id)); };

  const header = (
    <View>
      <View style={s.stats}>
        <StatCard value={data?.horses_total ?? 0} label="Caballos" s={s} />
        <StatCard value={data?.activity_today ?? 0} label="Hoy" s={s} />
        <StatCard value={data?.alerts_count ?? 0} label="Alertas" s={s} alert />
      </View>

      {alerts.length > 0 && (
        <View style={s.section}>
          <View style={s.alertHeader}>
            <AlertTriangle size={16} color={ALERT_COLOR} strokeWidth={2.4} />
            <Text style={s.alertTitle}>Alertas</Text>
          </View>
          <View style={s.group}>
            {alerts.map((item, i) => (
              <Animated.View key={`${item.horse_id}-${item.at}-${i}`} entering={FadeInDown.delay(Math.min(i, 6) * 40).duration(300)}>
                {i > 0 && <View style={s.divider} />}
                <FeedRow item={item} c={c} s={s} onPress={() => goHorse(item.horse_id)} />
              </Animated.View>
            ))}
          </View>
        </View>
      )}

      {rest.length > 0 && (
        <Text style={s.feedHeading}>Actividad reciente</Text>
      )}
    </View>
  );

  return (
    <View style={s.screen}>
      <ScreenHeader title="Supervisión" subtitle={fechaLarga()} showBack backTo={Routes.mas} />

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={c.brand} /></View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No se pudo cargar"
          message="Revisá tu conexión e intentá de nuevo."
          actionLabel="Reintentar"
          onAction={() => refetch()}
        />
      ) : (data?.feed?.length ?? 0) === 0 ? (
        <>
          {header}
          <EmptyState
            icon="file-tray-outline"
            title="Sin actividad todavía"
            message="Cuando el equipo registre rutinas, fotos o entrenamientos, vas a verlo acá."
          />
        </>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item, i) => `${item.horse_id}-${item.at}-${i}`}
          ListHeaderComponent={header}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(300)} style={[s.group, s.feedItemSpacing]}>
              <FeedRow item={item} c={c} s={s} onPress={() => goHorse(item.horse_id)} />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: space[16] },

  list: { paddingHorizontal: space[4], paddingBottom: space[10] },

  stats: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[2],
    paddingBottom: space[4],
  },
  statCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: space[4],
    paddingHorizontal: space[2],
    alignItems: 'center',
    ...shadow.sm,
  },
  statValue: { fontSize: text['2xl'], fontFamily: fontFamily.extrabold, fontWeight: weight.extrabold, color: c.text },
  statValueAlert: { color: ALERT_COLOR },
  statLabel: { fontSize: text.xs, fontFamily: fontFamily.medium, color: c.textFaint, marginTop: 2 },

  section: { paddingHorizontal: space[4], marginBottom: space[4] },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: space[1] + 2, marginBottom: space[2], paddingHorizontal: space[1] },
  alertTitle: {
    fontSize: text.xs, fontFamily: fontFamily.bold, fontWeight: weight.bold,
    color: ALERT_COLOR, textTransform: 'uppercase', letterSpacing: 1,
  },

  feedHeading: {
    fontSize: text.xs, fontFamily: fontFamily.bold, fontWeight: weight.bold,
    color: c.textFaint, textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: space[1], marginBottom: space[2],
  },

  group: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...shadow.sm,
  },
  feedItemSpacing: { marginBottom: space[3] },

  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[3] + 1,
  },
  feedRowAlert: { backgroundColor: `${ALERT_COLOR}0d` },
  feedIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  feedBody: { flex: 1, gap: 2 },
  feedTitle: { fontSize: text.sm, fontFamily: fontFamily.semibold, fontWeight: weight.semibold, color: c.text },
  feedDetail: { fontSize: text.xs, fontFamily: fontFamily.regular, color: c.textMuted, lineHeight: 16 },
  feedMeta: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: 2, flexWrap: 'wrap' },
  feedHorse: { fontSize: text.xs, fontFamily: fontFamily.semibold, fontWeight: weight.semibold, color: c.brand, maxWidth: 130 },
  feedAuthor: { fontSize: text.xs, fontFamily: fontFamily.regular, color: c.textFaint, maxWidth: 110 },
  feedTime: { fontSize: text.xs, fontFamily: fontFamily.regular, color: c.textFaint },
  dot: { fontSize: text.xs, color: c.textFaint },

  thumb: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: c.surfaceAlt, flexShrink: 0 },

  divider: { height: 1, backgroundColor: c.border, marginLeft: space[3] + 1 + 40 + space[3] },
});

import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { useDashboard } from '../../hooks/use-dashboard';
import { HomeSkeleton } from '../../components/Skeleton';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { colors } from '../../lib/colors';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { haptic } from '../../lib/haptics';
import type { Horse, Event } from '../../../packages/shared/src';

const ROLE_LABEL: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Administrador',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/* ─── Stat card ─── */
function StatCard({
  value, label, accent = false, sub,
}: { value: string | number; label: string; accent?: boolean; sub?: string }) {
  return (
    <View style={[s.statCard, accent && s.statCardAccent]}>
      <Text style={[s.statValue, accent && s.statValueAccent]}>{value}</Text>
      <Text style={[s.statLabel, accent && s.statLabelAccent]}>{label}</Text>
      {sub && <Text style={[s.statSub, accent && s.statSubAccent]}>{sub}</Text>}
    </View>
  );
}

/* ─── Quick action ─── */
function QuickAction({
  icon, label, onPress, color,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity style={s.qa} onPress={() => { haptic.light(); onPress(); }} activeOpacity={0.75}>
      <View style={[s.qaIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ─── Horse row ─── */
function HorseRow({ horse }: { horse: Horse }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={s.horseRow}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      activeOpacity={0.7}
    >
      <View style={s.horseAvatar}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={s.horseImg} />
          : (
            <View style={s.horseAvatarFallback}>
              <Text style={s.horseAvatarText}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
      </View>
      <View style={s.horseInfo}>
        <Text style={s.horseName}>{horse.name}</Text>
        <Text style={s.horseMeta} numberOfLines={1}>
          {[horse.breed?.name, horse.establishment?.name].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
    </TouchableOpacity>
  );
}

/* ─── Event row ─── */
function EventRow({ event }: { event: Event }) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  return (
    <View style={s.eventRow}>
      <EventTypeBadge type={event.type} />
      <View style={s.eventInfo}>
        <Text style={s.eventDesc} numberOfLines={1}>{event.description}</Text>
        {event.horse && <Text style={s.eventHorse}>{event.horse.name}</Text>}
      </View>
      <Text style={s.eventDate}>{date}</Text>
    </View>
  );
}

/* ─── Section header ─── */
function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={s.sectionLink}>Ver todos</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── Main ─── */
export default function InicioScreen() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (isLoading) {
    return (
      <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top }}>
        <HomeSkeleton />
      </ScrollView>
    );
  }

  const firstName = user?.name?.split(' ')[0] ?? '';
  const roleLabel = ROLE_LABEL[user?.role ?? ''] ?? '';

  const quickActions = [
    ...(user?.role !== 'veterinario' ? [{ icon: 'calendar-outline' as const, label: 'Eventos', color: '#3b82f6', path: '/(tabs)/eventos' }] : []),
    { icon: 'paw-outline' as const, label: 'Caballos', color: '#10b981', path: '/(tabs)/caballos' },
    { icon: 'time-outline' as const, label: 'Agenda', color: '#f59e0b', path: '/(tabs)/agenda' },
    ...(user?.role === 'establecimiento' || user?.role === 'propietario'
      ? [{ icon: 'receipt-outline' as const, label: 'Facturas', color: '#8b5cf6', path: '/(tabs)/facturacion' }]
      : []),
  ];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Hero header con gradiente ─── */}
      <LinearGradient
        colors={['#0f1f3d', '#1a3a6b', '#0f2d52']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + space[5] }]}
      >
        <View style={s.heroTop}>
          <View style={s.heroText}>
            <Text style={s.heroGreeting}>{greeting()},</Text>
            <Text style={s.heroName}>{firstName}</Text>
            <Text style={s.heroRole}>{roleLabel}</Text>
          </View>
          <TouchableOpacity
            style={s.heroAvatar}
            onPress={() => { haptic.light(); router.push('/(tabs)/perfil'); }}
            activeOpacity={0.8}
          >
            <Text style={s.heroAvatarText}>
              {user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats en el hero */}
        {data?.role === 'propietario' && (
          <View style={s.heroStats}>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).horses?.length ?? 0}</Text>
              <Text style={s.heroStatLabel}>Caballos</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>${((data as any).monthly_spend ?? 0).toLocaleString('es-AR')}</Text>
              <Text style={s.heroStatLabel}>Gasto del mes</Text>
            </View>
          </View>
        )}
        {data?.role === 'establecimiento' && (
          <View style={s.heroStats}>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).horses?.length ?? 0}</Text>
              <Text style={s.heroStatLabel}>En pensión</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).monthly_events_count ?? 0}</Text>
              <Text style={s.heroStatLabel}>Eventos del mes</Text>
            </View>
          </View>
        )}
        {data?.role === 'veterinario' && (
          <View style={s.heroStats}>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).total_horses ?? 0}</Text>
              <Text style={s.heroStatLabel}>Pacientes</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).upcoming_medical?.length ?? 0}</Text>
              <Text style={[s.heroStatLabel, (data as any).upcoming_medical?.length > 0 && { color: '#fbbf24' }]}>
                Vencen pronto
              </Text>
            </View>
          </View>
        )}
        {data?.role === 'admin' && (data as any).stats && (
          <View style={s.heroStats}>
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).stats.caballos}</Text>
              <Text style={s.heroStatLabel}>Caballos</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).stats.propietarios}</Text>
              <Text style={s.heroStatLabel}>Propietarios</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStatItem}>
              <Text style={s.heroStatValue}>{(data as any).stats.establecimientos}</Text>
              <Text style={s.heroStatLabel}>Establecimientos</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* ─── Acciones rápidas ─── */}
      <View style={s.qaSection}>
        {quickActions.map((qa) => (
          <QuickAction
            key={qa.path}
            icon={qa.icon}
            label={qa.label}
            color={qa.color}
            onPress={() => router.push(qa.path as any)}
          />
        ))}
      </View>

      {/* ─── Mis caballos ─── */}
      {(data as any)?.horses?.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title={data?.role === 'establecimiento' ? 'Caballos en pensión' : 'Mis caballos'}
            onPress={() => router.push('/(tabs)/caballos')}
          />
          <View style={s.card}>
            {(data as any).horses.slice(0, 5).map((h: Horse, i: number) => (
              <View key={h.id}>
                {i > 0 && <View style={s.divider} />}
                <HorseRow horse={h} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Directorio (propietario) ─── */}
      {data?.role === 'propietario' && (
        <TouchableOpacity
          style={s.directorio}
          onPress={() => { haptic.light(); router.push('/directorio'); }}
          activeOpacity={0.8}
        >
          <View style={s.directorioLeft}>
            <View style={s.directorioIcon}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={s.directorioTitle}>Buscar establecimientos</Text>
              <Text style={s.directorioSub}>Encontrá dónde alojar tu caballo</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
        </TouchableOpacity>
      )}

      {/* ─── Actividad reciente ─── */}
      {(data as any)?.recent_events?.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title="Actividad reciente"
            onPress={() => router.push('/(tabs)/eventos')}
          />
          <View style={s.card}>
            {(data as any).recent_events.map((ev: Event, i: number) => (
              <View key={ev.id}>
                {i > 0 && <View style={s.divider} />}
                <EventRow event={ev} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Sin datos */}
      {!(data as any)?.horses?.length && !(data as any)?.recent_events?.length && (
        <View style={s.welcome}>
          <Text style={s.welcomeEmoji}>🐎</Text>
          <Text style={s.welcomeTitle}>Bienvenido a HandicApp</Text>
          <Text style={s.welcomeSub}>Registrá tu primer caballo para empezar a usar todas las funciones.</Text>
          <TouchableOpacity
            style={s.welcomeBtn}
            onPress={() => { haptic.medium(); router.push('/(tabs)/caballos'); }}
            activeOpacity={0.85}
          >
            <Text style={s.welcomeBtnText}>Ir a Caballos</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { paddingBottom: 32 },

  /* Hero */
  hero: { paddingHorizontal: space[5], paddingBottom: space[6] },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space[5] },
  heroText: { gap: 2 },
  heroGreeting: { fontSize: text.sm, color: 'rgba(255,255,255,0.55)', fontWeight: weight.medium },
  heroName: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: colors.white, lineHeight: 34 },
  heroRole: { fontSize: text.xs, color: 'rgba(255,255,255,0.45)', fontWeight: weight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroAvatar: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroAvatarText: { fontSize: text.base, fontWeight: weight.extrabold, color: colors.white },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.lg, padding: space[4] },
  heroStatItem: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: text.xl, fontWeight: weight.extrabold, color: colors.white },
  heroStatLabel: { fontSize: text.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2, fontWeight: weight.medium },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' },

  /* Quick actions */
  qaSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.white,
    paddingVertical: space[4],
    paddingHorizontal: space[3],
    marginBottom: 2,
    ...shadow.sm,
  },
  qa: { alignItems: 'center', gap: space[2], minWidth: 64 },
  qaIcon: { width: 48, height: 48, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  qaLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray600 },

  /* Sections */
  section: { marginTop: space[5], paddingHorizontal: space[4], gap: space[3] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  sectionLink: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.primary },

  /* Card container */
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100,
    ...shadow.sm,
  },
  divider: { height: 1, backgroundColor: colors.gray50, marginHorizontal: space[4] },

  /* Horse row */
  horseRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] + 2 },
  horseAvatar: { width: 44, height: 44, borderRadius: radius.md, overflow: 'hidden' },
  horseImg: { width: '100%', height: '100%' },
  horseAvatarFallback: { width: '100%', height: '100%', backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center' },
  horseAvatarText: { fontSize: text.base, fontWeight: weight.bold, color: colors.primary },
  horseInfo: { flex: 1 },
  horseName: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  horseMeta: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },

  /* Event row */
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3] + 2 },
  eventInfo: { flex: 1 },
  eventDesc: { fontSize: text.sm, fontWeight: weight.medium, color: colors.gray900 },
  eventHorse: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  eventDate: { fontSize: text.xs, color: colors.gray400, minWidth: 38, textAlign: 'right' },

  /* Directorio */
  directorio: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray100,
    padding: space[4], marginHorizontal: space[4], marginTop: space[4],
    ...shadow.sm,
  },
  directorioLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  directorioIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center' },
  directorioTitle: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  directorioSub: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },

  /* Welcome (vacío) */
  welcome: { margin: space[4], marginTop: space[8], alignItems: 'center', gap: space[3] },
  welcomeEmoji: { fontSize: 48 },
  welcomeTitle: { fontSize: text.lg, fontWeight: weight.extrabold, color: colors.gray900 },
  welcomeSub: { fontSize: text.sm, color: colors.gray400, textAlign: 'center', lineHeight: 20 },
  welcomeBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: space[6], paddingVertical: space[3], marginTop: space[2] },
  welcomeBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },

  /* Stat card (legacy, puede quedar) */
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: space[4], borderWidth: 1, borderColor: colors.gray100 },
  statCardAccent: { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' },
  statValue: { fontSize: text.xl, fontWeight: weight.extrabold, color: colors.gray900 },
  statValueAccent: { color: colors.purple700 },
  statLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray500, marginTop: 2 },
  statLabelAccent: { color: colors.purple700 },
  statSub: { fontSize: text.xs, color: colors.gray400, marginTop: 1 },
  statSubAccent: { color: colors.purple700 },
});

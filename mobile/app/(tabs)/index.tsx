import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  Image as RNImage, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { useDashboard, type DashboardData } from '../../hooks/use-dashboard';
import { useNotifications } from '../../lib/notifications';
import { HomeSkeleton } from '../../components/Skeleton';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { colors } from '../../lib/colors';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { haptic } from '../../lib/haptics';
import { Routes, nav } from '../../lib/routes';
import type { Horse, Event } from '../../../packages/shared/src';

const ROLE_LABEL: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Administrador',
};

const ROLE_COLOR: Record<string, string> = {
  propietario:    '#c4922a',
  establecimiento:'#059669',
  veterinario:    '#7c3aed',
  admin:          '#3b82f6',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Horse card horizontal ───────────────────────────────────────────────────
function HorseScrollCard({ horse }: { horse: Horse }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={hc.card}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      activeOpacity={0.85}
    >
      <View style={hc.imgWrap}>
        {horse.image_url
          ? <RNImage source={{ uri: horse.image_url }} style={hc.img} resizeMode="cover" />
          : (
            <View style={hc.imgFallback}>
              <Text style={hc.imgFallbackText}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={hc.gradient}
          start={{ x: 0, y: 0.45 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={hc.nameWrap}>
          <Text style={hc.name} numberOfLines={1}>{horse.name}</Text>
          {horse.breed && <Text style={hc.breed} numberOfLines={1}>{horse.breed.name}</Text>}
        </View>
        {horse.activity && (
          <View style={hc.activityTag}>
            <Text style={hc.activityText}>{horse.activity.name}</Text>
          </View>
        )}
      </View>
      {horse.establishment && (
        <View style={hc.footer}>
          <Ionicons name="business-outline" size={10} color={colors.gray400} />
          <Text style={hc.footerText} numberOfLines={1}>{horse.establishment.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Quick action ────────────────────────────────────────────────────────────
function QuickAction({
  icon, label, onPress, color, badge,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  color: string;
  badge?: number;
}) {
  return (
    <TouchableOpacity style={qa.wrap} onPress={() => { haptic.light(); onPress(); }} activeOpacity={0.75}>
      <View style={[qa.icon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
        {badge != null && badge > 0 && (
          <View style={qa.badge}>
            <Text style={qa.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={qa.label} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Stat pill ───────────────────────────────────────────────────────────────
function StatPill({
  value, label, icon, color,
}: {
  value: string | number; label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string;
}) {
  return (
    <View style={[sp.pill, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 4 }} />
      <Text style={[sp.value, { color }]}>{value}</Text>
      <Text style={sp.label}>  {label}</Text>
    </View>
  );
}

// ─── Event row ───────────────────────────────────────────────────────────────
const EVENT_BORDER: Record<string, string> = {
  salud:         '#ef4444',
  entrenamiento: '#f59e0b',
  gasto:         '#8b5cf6',
  nota:          '#6b7280',
};

function EventRow({ event }: { event: Event }) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
  const borderColor = EVENT_BORDER[event.type] ?? colors.gray300;
  return (
    <View style={[s.eventRow, { borderLeftColor: borderColor }]}>
      <EventTypeBadge type={event.type} />
      <View style={s.eventInfo}>
        <Text style={s.eventDesc} numberOfLines={1}>{event.description}</Text>
        {event.horse && <Text style={s.eventHorse}>{event.horse.name}</Text>}
      </View>
      <Text style={s.eventDate}>{date}</Text>
    </View>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ title, count, onPress }: { title: string; count?: number; onPress?: () => void }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionTitleRow}>
        <Text style={s.sectionTitle}>{title}</Text>
        {count != null && count > 0 && (
          <View style={s.sectionBadge}>
            <Text style={s.sectionBadgeText}>{count}</Text>
          </View>
        )}
      </View>
      {onPress && (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={s.sectionLinkWrap}>
          <Text style={s.sectionLink}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Alert row ───────────────────────────────────────────────────────────────
function AlertRow({
  icon, color, title, subtitle, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string; title: string; subtitle?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[s.alertRow, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[s.alertIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.alertTitle}>{title}</Text>
        {subtitle && <Text style={s.alertSub}>{subtitle}</Text>}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={14} color={colors.gray300} />}
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function InicioScreen() {
  const { user } = useAuth();
  const { data, isLoading } = useDashboard();
  const { unread } = useNotifications();
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
  const roleColor = ROLE_COLOR[user?.role ?? ''] ?? '#c4922a';

  const quickActions = [
    { icon: 'search-outline' as const,       label: 'Buscar',     color: '#3b82f6', path: Routes.buscar },
    { icon: 'git-branch-outline' as const,   label: 'Árbol',      color: '#059669', path: Routes.arbol },
    { icon: 'book-outline' as const,         label: 'Padrón',     color: '#7c3aed', path: Routes.padron },
    ...(user?.role === 'propietario' ? [
      { icon: 'trophy-outline' as const,     label: 'Vender',     color: '#f59e0b', path: Routes.remateCrear },
      { icon: 'map-outline' as const,        label: 'Directorio', color: '#10b981', path: Routes.directorio },
    ] : []),
    ...(user?.role === 'establecimiento' || user?.role === 'admin' ? [
      { icon: 'mail-unread-outline' as const,label: 'Solicitudes',color: '#f97316', path: Routes.solicitudes },
    ] : []),
    ...(user?.role === 'propietario' || user?.role === 'establecimiento' ? [
      { icon: 'receipt-outline' as const,    label: 'Facturas',   color: '#8b5cf6', path: Routes.tabsFacturacion },
    ] : []),
    ...(user?.role !== 'propietario' ? [
      { icon: 'trophy-outline' as const,     label: 'Remates',    color: '#ec4899', path: Routes.remates },
    ] : []),
  ];

  const horses = data?.horses ?? [];
  const events = data?.recent_events ?? [];

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <LinearGradient
        colors={['#08152a', '#0f1f3d', '#132548']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top + space[4] }]}
      >
        {/* Top bar */}
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroDate}>{todayLabel()}</Text>
            <RNImage
              source={{ uri: 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370535/logo-icon-white_fbeduu.png' }}
              style={s.heroLogo}
              resizeMode="contain"
            />
          </View>
          <View style={s.heroActions}>
            <TouchableOpacity
              style={s.heroBtn}
              onPress={() => { haptic.light(); nav.push(router, Routes.buscar); }}
              activeOpacity={0.8}
            >
              <Ionicons name="search-outline" size={19} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.heroBtn}
              onPress={() => { haptic.light(); nav.push(router, Routes.notificaciones); }}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={19} color="rgba(255,255,255,0.8)" />
              {unread > 0 && <View style={s.heroBadge} />}
            </TouchableOpacity>
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
        </View>

        {/* Greeting */}
        <View style={s.heroGreeting}>
          <Text style={s.heroHi}>{greeting()},</Text>
          <Text style={s.heroName}>{firstName}</Text>
          <View style={[s.heroRolePill, { backgroundColor: roleColor + '25', borderColor: roleColor + '40' }]}>
            <View style={[s.heroRoleDot, { backgroundColor: roleColor }]} />
            <Text style={[s.heroRoleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Stats pills */}
        <View style={s.heroPills}>
          {data?.role === 'propietario' && <>
            <StatPill value={horses.length}                               label="caballos"     icon="paw-outline"      color="#60a5fa" />
            <StatPill value={`$${(data.monthly_spend ?? 0).toLocaleString('es-AR')}`} label="este mes" icon="receipt-outline"   color="#34d399" />
          </>}
          {data?.role === 'establecimiento' && <>
            <StatPill value={horses.length}                               label="en pensión"   icon="paw-outline"      color="#60a5fa" />
            <StatPill value={data.monthly_events_count ?? 0}              label="eventos"      icon="pulse-outline"    color="#a78bfa" />
          </>}
          {data?.role === 'veterinario' && <>
            <StatPill value={data.total_horses ?? 0}                      label="pacientes"    icon="paw-outline"      color="#60a5fa" />
            <StatPill value={data.upcoming_medical?.length ?? 0}          label="vencen pronto" icon="warning-outline" color="#fbbf24" />
          </>}
          {data?.role === 'admin' && data.stats && <>
            <StatPill value={data.stats.caballos}                         label="caballos"     icon="paw-outline"      color="#60a5fa" />
            <StatPill value={data.stats.propietarios}                     label="propietarios" icon="person-outline"   color="#34d399" />
            <StatPill value={data.stats.establecimientos}                 label="establecimientos" icon="business-outline" color="#f472b6" />
          </>}
        </View>
      </LinearGradient>

      {/* ── Quick actions ── */}
      <View style={s.qaContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.qaScroll}
        >
          {quickActions.map((action) => (
            <QuickAction
              key={action.path}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={() => nav.push(router, action.path)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Alertas veterinario ── */}
      {data?.role === 'veterinario' && (data.upcoming_medical?.length ?? 0) > 0 && (
        <View style={s.section}>
          <SectionHeader title="Vencimientos próximos" count={data.upcoming_medical?.length} />
          <View style={s.card}>
            {data.upcoming_medical?.slice(0, 3).map((item, i) => (
              <View key={item.id}>
                {i > 0 && <View style={s.divider} />}
                <AlertRow
                  icon="warning-outline"
                  color="#f59e0b"
                  title={item.name}
                  subtitle={`Vence: ${item.next_due}`}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Mis caballos ── */}
      {horses.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title={data?.role === 'establecimiento' ? 'Caballos en pensión' : 'Mis caballos'}
            count={horses.length}
            onPress={() => nav.push(router, Routes.tabsCaballos)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.horseScroll}
          >
            {horses.slice(0, 8).map((h: Horse) => (
              <HorseScrollCard key={h.id} horse={h} />
            ))}
            {horses.length > 8 && (
              <TouchableOpacity
                style={hc.moreCard}
                onPress={() => nav.push(router, Routes.tabsCaballos)}
                activeOpacity={0.8}
              >
                <View style={hc.moreIcon}>
                  <Ionicons name="arrow-forward" size={22} color={colors.primary} />
                </View>
                <Text style={hc.moreText}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Directorio propietario ── */}
      {data?.role === 'propietario' && (
        <TouchableOpacity
          style={s.directorio}
          onPress={() => { haptic.light(); router.push('/directorio'); }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#eff6ff', '#dbeafe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.directorioGrad}
          >
            <View style={s.directorioLeft}>
              <View style={s.directorioIconWrap}>
                <Ionicons name="business-outline" size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={s.directorioTitle}>Buscar establecimientos</Text>
                <Text style={s.directorioSub}>Encontrá dónde alojar tu caballo</Text>
              </View>
            </View>
            <View style={s.directorioCta}>
              <Text style={s.directorioCtaText}>Ver</Text>
              <Ionicons name="chevron-forward" size={12} color="#2563eb" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ── Actividad reciente ── */}
      {events.length > 0 && (
        <View style={s.section}>
          <SectionHeader
            title="Actividad reciente"
            onPress={() => nav.push(router, Routes.tabsEventos)}
          />
          <View style={s.card}>
            {events.map((ev: Event, i: number) => (
              <View key={ev.id}>
                {i > 0 && <View style={s.divider} />}
                <EventRow event={ev} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Bienvenida vacía ── */}
      {horses.length === 0 && events.length === 0 && (
        <View style={s.welcome}>
          <View style={s.welcomeIcon}>
            <Text style={{ fontSize: 40 }}>🐎</Text>
          </View>
          <Text style={s.welcomeTitle}>Bienvenido a HandicApp</Text>
          <Text style={s.welcomeSub}>Registrá tu primer caballo para empezar a gestionar su historial, eventos y más.</Text>
          <TouchableOpacity
            style={s.welcomeBtn}
            onPress={() => { haptic.medium(); router.push('/(tabs)/caballos'); }}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.white} />
            <Text style={s.welcomeBtnText}>Registrar caballo</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: space[6] }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { paddingBottom: 8 },

  hero: { paddingHorizontal: space[5], paddingBottom: space[5] },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space[4] },
  heroDate: { fontSize: text.xs, color: 'rgba(255,255,255,0.35)', fontWeight: weight.medium, textTransform: 'capitalize', marginBottom: 4 },
  heroLogo: { width: 32, height: 32 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  heroBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.09)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  heroBadge: {
    position: 'absolute', top: 5, right: 5,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1.5, borderColor: '#0f1f3d',
  },
  heroAvatar: {
    width: 38, height: 38, borderRadius: radius.full,
    backgroundColor: '#c4922a',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(196,146,42,0.35)',
  },
  heroAvatarText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },

  heroGreeting: { marginBottom: space[4], gap: 2 },
  heroHi: { fontSize: text.sm, color: 'rgba(255,255,255,0.45)', fontWeight: weight.medium },
  heroName: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: colors.white, lineHeight: 32, letterSpacing: -0.5 },
  heroRolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 3,
    borderWidth: 1, marginTop: 2,
  },
  heroRoleDot: { width: 5, height: 5, borderRadius: 3 },
  heroRoleText: { fontSize: text.xs, fontWeight: weight.semibold, letterSpacing: 0.3 },

  heroPills: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },

  qaContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
    ...shadow.sm,
  },
  qaScroll: { paddingHorizontal: space[4], paddingVertical: space[3], gap: space[2] },

  section: { marginTop: space[5], paddingHorizontal: space[4], gap: space[3] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  sectionBadge: {
    backgroundColor: colors.primary + '12', borderRadius: radius.full,
    paddingHorizontal: 7, paddingVertical: 1,
  },
  sectionBadgeText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.primary },
  sectionLinkWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLink: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.primary },

  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100,
    ...shadow.sm,
  },
  divider: { height: 1, backgroundColor: colors.gray50, marginHorizontal: space[4] },

  horseScroll: { paddingLeft: space[4], paddingRight: space[4], gap: space[3] },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    padding: space[4], borderLeftWidth: 3, borderLeftColor: colors.gray300,
  },
  eventInfo: { flex: 1 },
  eventDesc: { fontSize: text.sm, fontWeight: weight.medium, color: colors.gray900 },
  eventHorse: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  eventDate: { fontSize: text.xs, color: colors.gray400, minWidth: 38, textAlign: 'right' },

  alertRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    padding: space[4], borderLeftWidth: 3,
  },
  alertIcon: { width: 32, height: 32, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  alertTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  alertSub: { fontSize: text.xs, color: colors.gray500, marginTop: 1 },

  directorio: { marginHorizontal: space[4], marginTop: space[4], borderRadius: radius.xl, overflow: 'hidden', ...shadow.sm },
  directorioGrad: { padding: space[4], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  directorioLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  directorioIconWrap: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: '#dbeafe', justifyContent: 'center', alignItems: 'center' },
  directorioTitle: { fontSize: text.sm, fontWeight: weight.bold, color: '#1e40af' },
  directorioSub: { fontSize: text.xs, color: '#3b82f6', marginTop: 1 },
  directorioCta: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#2563eb', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  directorioCtaText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.white },

  welcome: { margin: space[5], marginTop: space[8], alignItems: 'center', gap: space[3] },
  welcomeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', ...shadow.md },
  welcomeTitle: { fontSize: text.xl, fontWeight: weight.extrabold, color: colors.gray900, textAlign: 'center' },
  welcomeSub: { fontSize: text.sm, color: colors.gray500, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  welcomeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: space[5], paddingVertical: space[3] + 2,
    marginTop: space[2], ...shadow.md,
  },
  welcomeBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
});

// Horse cards
const hc = StyleSheet.create({
  card: {
    width: 148, backgroundColor: colors.white, borderRadius: radius.xl,
    overflow: 'hidden', borderWidth: 1, borderColor: colors.gray200,
    ...shadow.sm,
  },
  imgWrap: { position: 'relative', aspectRatio: 1 },
  img: { width: '100%', height: '100%' },
  imgFallback: { flex: 1, backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center' },
  imgFallbackText: { fontSize: 38, fontWeight: '800', color: colors.primary, opacity: 0.3 },
  gradient: { ...StyleSheet.absoluteFillObject },
  nameWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  name: { fontSize: 13, fontWeight: '800', color: colors.white, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  breed: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  activityTag: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(15,31,61,0.7)', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  activityText: { fontSize: 9, fontWeight: '700', color: colors.white },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 6 },
  footerText: { fontSize: 10, color: colors.gray400, flex: 1 },
  moreCard: {
    width: 100, justifyContent: 'center', alignItems: 'center', gap: space[2],
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.gray200, borderStyle: 'dashed',
  },
  moreIcon: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  moreText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.primary },
});

// Quick actions
const qa = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, minWidth: 60 },
  icon: {
    width: 52, height: 52, borderRadius: radius.xl,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  label: { fontSize: 11, fontWeight: weight.semibold, color: colors.gray600, textAlign: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: colors.white,
  },
  badgeText: { fontSize: 9, fontWeight: weight.bold, color: colors.white },
});

// Stat pills
const sp = StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  value: { fontSize: text.sm, fontWeight: weight.extrabold },
  label: { fontSize: text.xs, fontWeight: weight.medium, color: 'rgba(255,255,255,0.5)' },
});

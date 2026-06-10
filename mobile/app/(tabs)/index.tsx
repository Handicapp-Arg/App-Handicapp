import { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../lib/auth';
import { useDashboard } from '../../hooks/use-dashboard';
import { useAgenda, APPOINTMENT_TYPES } from '../../hooks/use-agenda';
import { useFeedPosts } from '../../hooks/use-feed';
import { useNotifications } from '../../lib/notifications';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Horse } from '../../../packages/shared/src';

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function todayLabel() {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function formatCurrency(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  alimentacion:   { icon: '🌾', color: '#16a34a' },
  veterinario:    { icon: '💉', color: '#dc2626' },
  herradero:      { icon: '🔨', color: '#d97706' },
  entrenamiento:  { icon: '🏇', color: '#7c3aed' },
  mantenimiento:  { icon: '🔧', color: '#0284c7' },
  transporte:     { icon: '🚛', color: '#0891b2' },
  otros:          { icon: '📦', color: '#6b7280' },
};

// ─── Horse Story Chip ────────────────────────────────────────────────────────
function HorseStory({ horse }: { horse: Horse }) {
  const router = useRouter();
  const initials = horse.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const verified = !!horse.horse_record_id;

  return (
    <TouchableOpacity
      style={s.story}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      activeOpacity={0.8}
    >
      <View style={[s.storyRing, verified && s.storyRingVerified]}>
        {horse.image_url ? (
          <Image source={{ uri: horse.image_url }} style={s.storyImg} />
        ) : (
          <View style={s.storyPlaceholder}>
            <Text style={s.storyInitials}>{initials}</Text>
          </View>
        )}
        {verified && (
          <View style={s.storyVerifiedDot}>
            <Ionicons name="shield-checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={s.storyName} numberOfLines={1}>{horse.name.split(' ')[0]}</Text>
    </TouchableOpacity>
  );
}

// ─── Agenda Item ─────────────────────────────────────────────────────────────
function AgendaItem({ appt }: { appt: ReturnType<typeof useAgenda>['data'] extends (infer T)[] | undefined ? T : never }) {
  if (!appt) return null;
  const meta = APPOINTMENT_TYPES[appt.type] ?? APPOINTMENT_TYPES.otro;
  const date = new Date(appt.scheduled_at);
  const isToday = date.toDateString() === new Date().toDateString();
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = isToday
    ? `Hoy · ${timeStr}`
    : date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) + ` · ${timeStr}`;

  return (
    <View style={s.agendaItem}>
      <View style={[s.agendaDot, { backgroundColor: meta.color }]} />
      <View style={s.agendaBody}>
        <Text style={s.agendaTitle} numberOfLines={1}>{appt.title}</Text>
        {appt.horse && <Text style={s.agendaHorse} numberOfLines={1}>{appt.horse.name}</Text>}
      </View>
      <View style={[s.agendaDateBadge, isToday && { backgroundColor: meta.bg }]}>
        <Text style={[s.agendaDate, isToday && { color: meta.color }]}>{dateStr}</Text>
      </View>
    </View>
  );
}

// ─── Mini Post ───────────────────────────────────────────────────────────────
function MiniPost({ post }: { post: any }) {
  const ago = (() => {
    try { return formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es }); }
    catch { return ''; }
  })();
  const initials = (post.author?.name ?? 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={s.miniPost}>
      <View style={s.miniPostAvatar}>
        <Text style={s.miniPostAvatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.miniPostAuthor} numberOfLines={1}>{post.author?.name}</Text>
          <Text style={s.miniPostTime}>{ago}</Text>
        </View>
        <Text style={s.miniPostContent} numberOfLines={2}>{post.content}</Text>
      </View>
      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={s.miniPostImg} />
      )}
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { data: dash, isLoading: dashLoading, refetch: refetchDash, isRefetching: dashRefetching } = useDashboard();
  const { data: agenda = [], refetch: refetchAgenda, isRefetching: agendaRefetching } = useAgenda(true);
  const { posts: feedPosts, refresh: refreshFeed, isRefreshing: feedRefreshing } = useFeedPosts();

  const isRefetching = dashRefetching || agendaRefetching || feedRefreshing;
  const refetch = useCallback(async () => {
    await Promise.all([refetchDash(), refetchAgenda()]);
    refreshFeed();
  }, [refetchDash, refetchAgenda, refreshFeed]);

  const horses: Horse[] = dash?.horses ?? [];
  const upcomingAgenda = agenda.filter((a) => !a.completed).slice(0, 4);
  const recentPosts = feedPosts.slice(0, 2);
  const monthlySpend = dash?.monthly_spend ?? 0;
  const monthlyEvents = dash?.monthly_events_count ?? 0;
  const spendByHorse = dash?.spend_by_horse ?? [];
  const spendByCategory = dash?.spend_by_category ?? [];
  const recentExpenses = dash?.recent_expenses ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.gray50 }}
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      {/* ─── Header ─── */}
      <LinearGradient
        colors={[colors.primary, '#1a3366']}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerGreeting}>{greeting()}, {user?.name?.split(' ')[0]} 👋</Text>
            <Text style={s.headerDate}>{todayLabel()}</Text>
          </View>
          <TouchableOpacity
            style={s.bellBtn}
            onPress={() => { haptic.light(); router.push('/notificaciones'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unread > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats rápidos */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={s.statNum}>{horses.length}</Text>
            <Text style={s.statLabel}>Caballos</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statChip}>
            <Text style={s.statNum}>{upcomingAgenda.length}</Text>
            <Text style={s.statLabel}>Próximos turnos</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statChip}>
            <Text style={s.statNum}>{monthlyEvents}</Text>
            <Text style={s.statLabel}>Eventos este mes</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ─── Mis Caballos (stories) ─── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Mis caballos</Text>
          <TouchableOpacity onPress={() => { haptic.light(); router.push('/(tabs)/caballos'); }} activeOpacity={0.7}>
            <Text style={s.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {dashLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : horses.length === 0 ? (
          <TouchableOpacity
            style={s.emptyHorses}
            onPress={() => { haptic.light(); router.push('/(tabs)/caballos'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            <Text style={s.emptyHorsesText}>Registrá tu primer caballo</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.stories}>
            {horses.map((h) => <HorseStory key={h.id} horse={h} />)}
            <TouchableOpacity
              style={s.storyAdd}
              onPress={() => { haptic.light(); router.push('/(tabs)/caballos'); }}
              activeOpacity={0.8}
            >
              <View style={s.storyAddCircle}>
                <Ionicons name="add" size={22} color={colors.primary} />
              </View>
              <Text style={s.storyName}>Nuevo</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* ─── Agenda próxima ─── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Próximos turnos</Text>
          <TouchableOpacity onPress={() => { haptic.light(); router.push('/(tabs)/agenda'); }} activeOpacity={0.7}>
            <Text style={s.sectionLink}>Ver agenda</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          {upcomingAgenda.length === 0 ? (
            <TouchableOpacity
              style={s.emptyAgenda}
              onPress={() => { haptic.light(); router.push('/(tabs)/agenda'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.gray300} />
              <Text style={s.emptyAgendaText}>Sin turnos próximos</Text>
              <Text style={s.emptyAgendaSub}>Tocá para agendar uno</Text>
            </TouchableOpacity>
          ) : (
            upcomingAgenda.map((appt, i) => (
              <View key={appt.id}>
                {i > 0 && <View style={s.divider} />}
                <AgendaItem appt={appt} />
              </View>
            ))
          )}
        </View>
      </View>

      {/* ─── Gastos del mes ─── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Gastos este mes</Text>
          <TouchableOpacity
            onPress={() => { haptic.light(); router.push('/(tabs)/caballos'); }}
            activeOpacity={0.7}
          >
            <Text style={s.sectionLink}>Ver caballos</Text>
          </TouchableOpacity>
        </View>

        {/* Total header */}
        <View style={s.spendCard}>
          <LinearGradient
            colors={['#0f2d5a', '#1a3366']}
            style={s.spendGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={s.spendLeft}>
              <Text style={s.spendLabel}>Total del mes</Text>
              <Text style={s.spendAmount}>{monthlySpend > 0 ? formatCurrency(monthlySpend) : '—'}</Text>
              <Text style={s.spendSub}>{horses.length} {horses.length === 1 ? 'caballo' : 'caballos'}</Text>
            </View>
            <View style={s.spendIcon}>
              <Ionicons name="cash-outline" size={32} color="rgba(255,255,255,0.25)" />
            </View>
          </LinearGradient>
        </View>

        {monthlySpend > 0 && (
          <>
            {/* Por caballo */}
            {spendByHorse.length > 0 && (
              <View style={[s.card, { marginTop: space[3] }]}>
                <Text style={s.subSectionTitle}>Por caballo</Text>
                {spendByHorse.map((h, i) => {
                  const pct = Math.round((h.total / monthlySpend) * 100);
                  return (
                    <View key={h.horse_id}>
                      {i > 0 && <View style={s.divider} />}
                      <View style={s.spendRow}>
                        <View style={s.spendRowLeft}>
                          <Text style={s.spendRowName} numberOfLines={1}>{h.horse_name}</Text>
                          <View style={s.spendBar}>
                            <View style={[s.spendBarFill, { width: `${pct}%` as any }]} />
                          </View>
                        </View>
                        <Text style={s.spendRowAmount}>{formatCurrency(h.total)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Por categoría */}
            {spendByCategory.length > 0 && (
              <View style={[s.card, { marginTop: space[3] }]}>
                <Text style={s.subSectionTitle}>Por categoría</Text>
                <View style={s.categoryGrid}>
                  {spendByCategory.slice(0, 6).map((c) => {
                    const meta = CATEGORY_META[c.category] ?? CATEGORY_META.otros;
                    return (
                      <View key={c.category} style={s.categoryChip}>
                        <Text style={s.categoryIcon}>{meta.icon}</Text>
                        <Text style={s.categoryName} numberOfLines={1}>{c.category}</Text>
                        <Text style={[s.categoryAmount, { color: meta.color }]}>{formatCurrency(c.total)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Últimos gastos */}
            {recentExpenses.length > 0 && (
              <View style={[s.card, { marginTop: space[3] }]}>
                <Text style={s.subSectionTitle}>Últimos gastos</Text>
                {recentExpenses.map((e: any, i: number) => (
                  <View key={e.id}>
                    {i > 0 && <View style={s.divider} />}
                    <View style={s.expenseRow}>
                      <Text style={s.expenseIcon}>
                        {CATEGORY_META[e.expense_category ?? 'otros']?.icon ?? '📦'}
                      </Text>
                      <View style={s.expenseBody}>
                        <Text style={s.expenseDesc} numberOfLines={1}>{e.description || e.title}</Text>
                        <Text style={s.expenseMeta} numberOfLines={1}>
                          {e.horse?.name} · {new Date(e.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      <Text style={s.expenseAmount}>{formatCurrency(e.amount)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {monthlySpend === 0 && (
          <View style={[s.card, { marginTop: space[3] }]}>
            <View style={s.emptyAgenda}>
              <Ionicons name="receipt-outline" size={24} color={colors.gray300} />
              <Text style={s.emptyAgendaText}>Sin gastos registrados este mes</Text>
              <Text style={s.emptyAgendaSub}>Registralos desde el detalle de cada caballo</Text>
            </View>
          </View>
        )}
      </View>

      {/* ─── Del muro ─── */}
      {recentPosts.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Del muro</Text>
            <TouchableOpacity onPress={() => { haptic.light(); router.push('/(tabs)/muro'); }} activeOpacity={0.7}>
              <Text style={s.sectionLink}>Ver todo</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            {recentPosts.map((post: any, i: number) => (
              <View key={post.id}>
                {i > 0 && <View style={s.divider} />}
                <MiniPost post={post} />
              </View>
            ))}
            <TouchableOpacity
              style={s.muroBtn}
              onPress={() => { haptic.light(); router.push('/(tabs)/muro'); }}
              activeOpacity={0.8}
            >
              <Text style={s.muroBtnText}>Ver más publicaciones</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  // Header
  header: { paddingHorizontal: space[4], paddingBottom: space[5] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space[4] },
  headerGreeting: { fontSize: text.md, fontWeight: weight.bold, color: '#fff' },
  headerDate: { fontSize: text.xs, color: 'rgba(255,255,255,0.6)', marginTop: 2, textTransform: 'capitalize' },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  bellBadge: { position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 8, fontWeight: weight.extrabold, color: '#fff' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.lg, padding: space[3], gap: 0 },
  statChip: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: text.lg, fontWeight: weight.extrabold, color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 1, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  // Sections
  section: { paddingHorizontal: space[4], marginTop: space[5] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[3] },
  sectionTitle: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLink: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.primary },
  card: { backgroundColor: '#fff', borderRadius: radius.xl, ...shadow.sm, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: colors.gray100, marginHorizontal: space[4] },

  // Stories
  stories: { paddingRight: space[4], gap: space[4], paddingLeft: 2 },
  story: { alignItems: 'center', width: 64 },
  storyRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: colors.gray200, padding: 2, marginBottom: 5, position: 'relative' },
  storyRingVerified: { borderColor: '#10a37f' },
  storyImg: { width: '100%', height: '100%', borderRadius: 26 },
  storyPlaceholder: { flex: 1, borderRadius: 26, backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center' },
  storyInitials: { fontSize: 18, fontWeight: weight.extrabold, color: colors.primary, opacity: 0.5 },
  storyVerifiedDot: { position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10a37f', borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  storyName: { fontSize: 10, fontWeight: weight.semibold, color: colors.gray700, textAlign: 'center' },
  storyAdd: { alignItems: 'center', width: 64 },
  storyAddCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.gray200, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },

  // Empty states
  emptyHorses: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: '#fff', borderRadius: radius.xl, padding: space[4], ...shadow.sm },
  emptyHorsesText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.primary },
  emptyAgenda: { alignItems: 'center', paddingVertical: space[6], gap: space[2] },
  emptyAgendaText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray400 },
  emptyAgendaSub: { fontSize: text.xs, color: colors.gray300 },

  // Agenda
  agendaItem: { flexDirection: 'row', alignItems: 'center', padding: space[4], gap: space[3] },
  agendaDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  agendaBody: { flex: 1, minWidth: 0 },
  agendaTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  agendaHorse: { fontSize: text.xs, color: colors.gray400, marginTop: 1 },
  agendaDateBadge: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  agendaDate: { fontSize: 10, fontWeight: weight.semibold, color: colors.gray500 },

  // Spend card
  spendCard: { borderRadius: radius.xl, overflow: 'hidden', ...shadow.md },
  spendGrad: { flexDirection: 'row', alignItems: 'center', padding: space[5] },
  spendLeft: { flex: 1 },
  spendLabel: { fontSize: text.xs, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  spendAmount: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: '#fff' },
  spendSub: { fontSize: text.xs, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  spendIcon: { marginLeft: space[4] },
  subSectionTitle: { fontSize: 11, fontWeight: weight.bold, color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[2] },
  spendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3], gap: space[3] },
  spendRowLeft: { flex: 1, gap: 5 },
  spendRowName: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  spendBar: { height: 4, backgroundColor: colors.gray100, borderRadius: 2, overflow: 'hidden' },
  spendBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  spendRowAmount: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900, flexShrink: 0 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: space[3], gap: space[2] },
  categoryChip: { width: '30%', flexGrow: 1, backgroundColor: colors.gray50, borderRadius: radius.md, padding: space[3], alignItems: 'center', gap: 3 },
  categoryIcon: { fontSize: 20 },
  categoryName: { fontSize: 10, fontWeight: weight.semibold, color: colors.gray500, textTransform: 'capitalize', textAlign: 'center' },
  categoryAmount: { fontSize: 12, fontWeight: weight.bold, textAlign: 'center' },
  expenseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3], gap: space[3] },
  expenseIcon: { fontSize: 20 },
  expenseBody: { flex: 1, minWidth: 0 },
  expenseDesc: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  expenseMeta: { fontSize: text.xs, color: colors.gray400, marginTop: 1 },
  expenseAmount: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900, flexShrink: 0 },

  // Mini posts
  miniPost: { flexDirection: 'row', alignItems: 'flex-start', padding: space[4], gap: space[3] },
  miniPostAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  miniPostAvatarText: { fontSize: 13, fontWeight: weight.bold, color: colors.primary, opacity: 0.6 },
  miniPostAuthor: { fontSize: text.xs, fontWeight: weight.bold, color: colors.gray900, flex: 1 },
  miniPostTime: { fontSize: 10, color: colors.gray400, flexShrink: 0 },
  miniPostContent: { fontSize: text.xs, color: colors.gray600, marginTop: 3, lineHeight: 17 },
  miniPostImg: { width: 48, height: 48, borderRadius: radius.sm, flexShrink: 0 },
  muroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: space[3], borderTopWidth: 1, borderTopColor: colors.gray100 },
  muroBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.primary },
});

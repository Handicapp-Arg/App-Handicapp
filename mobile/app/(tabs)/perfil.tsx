import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { useNotifications } from '../../lib/notifications';
import { colors } from '../../lib/colors';
import { space, text, radius, weight } from '../../styles/tokens';
import { layout } from '../../styles/common';
import { usePlanStatus, useAdminPlanUsers, useAdminSetPlan, type AdminPlanUser } from '../../hooks/use-plan';
import { useBoardingRequests, useAcceptBoardingRequest, useRejectBoardingRequest } from '../../hooks/use-boarding-requests';

const ROLE_LABELS: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Administrador',
};

const MONTHS_OPTIONS = [
  { label: '1 mes', value: 1 },
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

/* ─── Plan Banner para perfil ─── */
function PlanCard({ plan, horseCount, horseLimit, isLimited }: {
  plan: string; horseCount: number; horseLimit: number | null; isLimited: boolean;
}) {
  const isPro = plan === 'pro';
  const pct = horseLimit ? Math.min((horseCount / horseLimit) * 100, 100) : 0;

  return (
    <View style={[styles.planCard, isPro ? styles.planCardPro : styles.planCardFree]}>
      <View style={styles.planHeader}>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{isPro ? '⭐ Pro' : 'Gratis'}</Text>
        </View>
        {!isPro && horseLimit && (
          <Text style={styles.planUsage}>{horseCount}/{horseLimit} caballos</Text>
        )}
        {isPro && (
          <Text style={styles.planUsagePro}>{horseCount} caballos</Text>
        )}
      </View>
      {!isPro && horseLimit && (
        <>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: isLimited ? colors.amber600 : colors.primary }]} />
          </View>
          {isLimited && (
            <Text style={styles.planWarning}>Límite alcanzado. Pedile al administrador que active el plan Pro.</Text>
          )}
        </>
      )}
      {isPro && (
        <Text style={styles.planProMsg}>Acceso ilimitado a todas las funciones.</Text>
      )}
    </View>
  );
}

/* ─── Fila de usuario para admin ─── */
function AdminUserPlanRow({ u, onActivate, onRevoke, isPending }: {
  u: AdminPlanUser;
  onActivate: (userId: string, months: number) => void;
  onRevoke: (userId: string) => void;
  isPending: boolean;
}) {
  const [months, setMonths] = useState(1);
  const [showMonths, setShowMonths] = useState(false);
  const isPro = u.plan === 'pro';
  const expiresStr = u.plan_expires_at
    ? new Date(u.plan_expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  return (
    <View style={styles.adminRow}>
      <View style={styles.adminRowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.adminRowName} numberOfLines={1}>{u.name}</Text>
          <Text style={styles.adminRowEmail} numberOfLines={1}>{u.email}</Text>
          <Text style={styles.adminRowMeta}>{ROLE_LABELS[u.role] ?? u.role} · {u.horse_count} caballos</Text>
        </View>
        <View style={[styles.planPill, isPro ? styles.planPillPro : styles.planPillFree]}>
          <Text style={[styles.planPillText, isPro ? styles.planPillTextPro : styles.planPillTextFree]}>
            {isPro ? '⭐ Pro' : 'Gratis'}
          </Text>
        </View>
      </View>

      {isPro && expiresStr && (
        <Text style={styles.adminExpires}>Vence: {expiresStr}</Text>
      )}

      {!isPro && (
        <>
          <TouchableOpacity onPress={() => setShowMonths((p) => !p)} style={styles.monthsToggle}>
            <Text style={styles.monthsToggleText}>Duración: {months} {months === 1 ? 'mes' : 'meses'} ▾</Text>
          </TouchableOpacity>
          {showMonths && (
            <View style={styles.monthsGrid}>
              {MONTHS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { setMonths(opt.value); setShowMonths(false); }}
                  style={[styles.monthsOption, months === opt.value && styles.monthsOptionActive]}
                >
                  <Text style={[styles.monthsOptionText, months === opt.value && styles.monthsOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.activateBtn}
            onPress={() => onActivate(u.id, months)}
            disabled={isPending}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.activateBtnText}>Activar Pro</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {isPro && (
        <TouchableOpacity
          style={styles.revokeBtn}
          onPress={() => Alert.alert('Revocar Pro', `¿Querés quitar el plan Pro a ${u.name}?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Revocar', style: 'destructive', onPress: () => onRevoke(u.id) },
          ])}
          disabled={isPending}
          activeOpacity={0.85}
        >
          <Text style={styles.revokeBtnText}>Revocar Pro</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── Main ─── */

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const { notifications, unread, markAllRead } = useNotifications();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: planStatus } = usePlanStatus();
  const { data: adminUsers, isLoading: loadingAdminUsers } = useAdminPlanUsers();
  const setPlan = useAdminSetPlan();
  const [adminSearch, setAdminSearch] = useState('');

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const { data: boardingRequests } = useBoardingRequests();
  const acceptRequest = useAcceptBoardingRequest();
  const rejectRequest = useRejectBoardingRequest();

  if (!user) return null;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const isAdmin = user.role === 'admin';
  const isEstab = user.role === 'establecimiento';
  const showPlan = user.role === 'propietario' || user.role === 'establecimiento';

  const pendingRequests = boardingRequests?.filter((r) => r.status === 'pending') ?? [];

  const filteredAdminUsers = adminUsers?.filter((u) =>
    adminSearch ? u.name.toLowerCase().includes(adminSearch.toLowerCase()) || u.email.toLowerCase().includes(adminSearch.toLowerCase()) : true,
  );

  return (
    <ScrollView
      style={layout.root}
      contentContainerStyle={[styles.content, { paddingBottom: space[10] }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero del perfil */}
      <View style={[styles.hero, { paddingTop: insets.top + space[5] }]}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
        </View>
      </View>

      {/* Plan (propietario / establecimiento) */}
      {showPlan && planStatus && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi plan</Text>
          <PlanCard
            plan={planStatus.plan}
            horseCount={planStatus.horse_count}
            horseLimit={planStatus.horse_limit}
            isLimited={planStatus.is_limited}
          />
        </View>
      )}

      {/* Accesos rápidos */}
      {(showPlan || isAdmin) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <View style={quickStyles.list}>
            {(showPlan || isAdmin) && (
              <TouchableOpacity style={quickStyles.item} onPress={() => router.push('/contratos')} activeOpacity={0.8}>
                <View style={quickStyles.iconWrap}>
                  <Text style={quickStyles.icon}>📄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={quickStyles.label}>Contratos de pensión</Text>
                  <Text style={quickStyles.desc}>Firmá o revisá contratos</Text>
                </View>
                <Text style={quickStyles.arrow}>›</Text>
              </TouchableOpacity>
            )}
            {user?.role === 'propietario' && (
              <TouchableOpacity style={quickStyles.item} onPress={() => router.push('/directorio' as any)} activeOpacity={0.8}>
                <View style={quickStyles.iconWrap}>
                  <Text style={quickStyles.icon}>🏡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={quickStyles.label}>Directorio de establecimientos</Text>
                  <Text style={quickStyles.desc}>Encontrá establecimientos en HandicApp</Text>
                </View>
                <Text style={quickStyles.arrow}>›</Text>
              </TouchableOpacity>
            )}
            {(user?.role === 'establecimiento' || user?.role === 'admin') && (
              <TouchableOpacity style={quickStyles.item} onPress={() => router.push('/organizacion' as any)} activeOpacity={0.8}>
                <View style={quickStyles.iconWrap}>
                  <Text style={quickStyles.icon}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={quickStyles.label}>Organización</Text>
                  <Text style={quickStyles.desc}>Miembros, plan, invitaciones</Text>
                </View>
                <Text style={quickStyles.arrow}>›</Text>
              </TouchableOpacity>
            )}
            {(user?.role === 'establecimiento' || user?.role === 'admin') && (
              <TouchableOpacity style={quickStyles.item} onPress={() => router.push('/solicitudes' as any)} activeOpacity={0.8}>
                <View style={quickStyles.iconWrap}>
                  <Text style={quickStyles.icon}>📨</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={quickStyles.label}>Solicitudes</Text>
                  <Text style={quickStyles.desc}>Pensión de caballos · aceptar o rechazar</Text>
                </View>
                <Text style={quickStyles.arrow}>›</Text>
              </TouchableOpacity>
            )}
            {isAdmin && (
              <TouchableOpacity style={quickStyles.item} onPress={() => router.push('/superadmin' as any)} activeOpacity={0.8}>
                <View style={quickStyles.iconWrap}>
                  <Text style={quickStyles.icon}>⚙️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={quickStyles.label}>Panel superadmin</Text>
                  <Text style={quickStyles.desc}>MRR · planes · organizaciones</Text>
                </View>
                <Text style={quickStyles.arrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Solicitudes de alojamiento (establecimiento) */}
      {isEstab && pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solicitudes de alojamiento</Text>
          <Text style={styles.sectionSubtitle}>Propietarios que quieren alojar sus caballos en tu establecimiento.</Text>
          <View style={styles.adminList}>
            {pendingRequests.map((req) => (
              <View key={req.id} style={{ backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, padding: 14, gap: 10 }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: weight.bold, color: colors.gray900 }}>
                    {req.requester?.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.gray500 }}>
                    Solicita alojar a <Text style={{ fontWeight: weight.semibold, color: colors.primary }}>{req.horse?.name}</Text>
                  </Text>
                  {req.message && (
                    <Text style={{ fontSize: 11, color: colors.gray400, fontStyle: 'italic' }}>"{req.message}"</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5', paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => {
                      haptic.medium();
                      Alert.alert('Rechazar solicitud', '¿Rechazás la solicitud de alojamiento?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Rechazar', style: 'destructive', onPress: () => rejectRequest.mutate(req.id) },
                      ]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 12, fontWeight: weight.semibold, color: colors.red700 }}>Rechazar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ flex: 1, borderRadius: 8, backgroundColor: colors.primary, paddingVertical: 8, alignItems: 'center' }}
                    onPress={() => {
                      haptic.medium();
                      Alert.alert('Aceptar solicitud', `¿Aceptás alojar a ${req.horse?.name}?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Aceptar', onPress: () => { haptic.success(); acceptRequest.mutate(req.id); } },
                      ]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 12, fontWeight: weight.bold, color: colors.white }}>Aceptar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Gestión de planes (admin) */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestión de planes</Text>
          <Text style={styles.sectionSubtitle}>Activá o revocá el plan Pro para propietarios y establecimientos.</Text>

          {loadingAdminUsers ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: space[3] }} />
          ) : !filteredAdminUsers?.length ? (
            <Text style={styles.emptyText}>No hay usuarios registrados.</Text>
          ) : (
            <View style={styles.adminList}>
              {filteredAdminUsers.map((u) => (
                <AdminUserPlanRow
                  key={u.id}
                  u={u}
                  onActivate={(userId, months) => setPlan.mutate({ userId, plan: 'pro', months })}
                  onRevoke={(userId) => setPlan.mutate({ userId, plan: 'free' })}
                  isPending={setPlan.isPending}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Notificaciones recientes */}
      {notifications.length > 0 && (
        <View style={styles.section}>
          <View style={styles.notifHeader}>
            <Text style={styles.sectionTitle}>Notificaciones</Text>
            {unread > 0 && (
              <TouchableOpacity onPress={markAllRead}>
                <Text style={styles.markRead}>Marcar todas como leídas</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.notifList}>
            {notifications.slice(0, 8).map((n) => (
              <View key={n.id} style={[styles.notifItem, !n.read && styles.notifUnread]}>
                {!n.read && <View style={styles.notifDot} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifMsg} numberOfLines={2}>{n.message}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cerrar sesión */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={18} color={colors.red700} />
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[5] },

  /* Hero */
  hero: {
    alignItems: 'center', gap: space[2],
    backgroundColor: colors.primary,
    paddingBottom: space[6],
    paddingHorizontal: space[5],
  },
  avatar: {
    width: 80, height: 80, borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: colors.white },
  userName: { fontSize: text.lg, fontWeight: weight.extrabold, color: colors.white },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
    paddingHorizontal: space[4], paddingVertical: space[1] + 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  roleText: { fontSize: text.xs, fontWeight: weight.bold, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 },
  userEmail: { fontSize: text.sm, color: 'rgba(255,255,255,0.55)' },
  section: { gap: space[2] + 2, paddingHorizontal: space[5] },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  sectionSubtitle: { fontSize: text.sm, color: colors.gray500 },
  emptyText: { fontSize: text.sm, color: colors.gray400 },

  /* Plan card */
  planCard: { borderRadius: radius.lg, padding: space[4], gap: space[2], borderWidth: 1 },
  planCardFree: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  planCardPro: { backgroundColor: colors.amber50, borderColor: '#fde68a' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planBadge: { backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] },
  planBadgeText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.white },
  planUsage: { fontSize: text.sm, fontWeight: weight.semibold, color: '#1e40af' },
  planUsagePro: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.amber600 },
  progressTrack: { height: 6, backgroundColor: '#dbeafe', borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  planWarning: { fontSize: text.xs, color: colors.amber600, fontWeight: weight.medium },
  planProMsg: { fontSize: text.xs, color: colors.amber600 },

  /* Admin list */
  adminList: { gap: space[3] },
  adminRow: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.gray200,
    padding: space[4], gap: space[2] + 2,
  },
  adminRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  adminRowName: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  adminRowEmail: { fontSize: text.xs, color: colors.gray500, marginTop: 2 },
  adminRowMeta: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  adminExpires: { fontSize: text.xs, color: colors.gray400 },
  planPill: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] },
  planPillFree: { backgroundColor: colors.gray100 },
  planPillPro: { backgroundColor: colors.amber50 },
  planPillText: { fontSize: text.xs, fontWeight: weight.bold },
  planPillTextFree: { color: colors.gray500 },
  planPillTextPro: { color: colors.amber600 },
  monthsToggle: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200,
    paddingHorizontal: space[3], paddingVertical: space[2],
    backgroundColor: colors.gray50,
  },
  monthsToggleText: { fontSize: text.sm, color: colors.gray700 },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  monthsOption: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200,
    paddingHorizontal: space[3], paddingVertical: space[2],
    backgroundColor: colors.white,
  },
  monthsOptionActive: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  monthsOptionText: { fontSize: text.sm, color: colors.gray600 },
  monthsOptionTextActive: { color: colors.primary, fontWeight: weight.semibold },
  activateBtn: {
    backgroundColor: colors.amber600, borderRadius: radius.md,
    paddingVertical: space[3], alignItems: 'center',
  },
  activateBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  revokeBtn: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    paddingVertical: space[3], alignItems: 'center', backgroundColor: colors.gray50,
  },
  revokeBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: colors.gray500 },

  /* Notificaciones */
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  markRead: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.primary },
  notifList: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden' },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] + 2, padding: space[3], borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  notifUnread: { backgroundColor: '#f0f4ff' },
  notifDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary, marginTop: 5, flexShrink: 0 },
  notifTitle: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  notifMsg: { fontSize: text.xs, color: colors.gray500, marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: '#fef2f2', borderRadius: radius.lg, borderWidth: 1, borderColor: '#fecaca',
    paddingVertical: space[4], marginHorizontal: space[5],
  },
  logoutText: { fontSize: text.base, fontWeight: weight.bold, color: colors.red700 },

  permGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  permBadge: {
    backgroundColor: colors.white, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.gray200,
    paddingHorizontal: space[2] + 2, paddingVertical: space[1] + 2,
  },
  permText: { fontSize: text.xs, fontWeight: weight.medium, color: colors.gray700 },
});

const quickStyles = StyleSheet.create({
  list: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', padding: space[4], gap: space[3], borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  iconWrap: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 20 },
  label: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  desc: { fontSize: text.xs, color: colors.gray400, marginTop: 1 },
  arrow: { fontSize: 22, color: colors.gray300, fontWeight: weight.regular },
});

import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  User, ChevronRight, Lock, LogOut, Crown,
  type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { usePlanStatus, useAdminPlanUsers, useAdminSetPlan, type AdminPlanUser } from '../../hooks/use-plan';

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

/* ─── Plan Card ─── */

function PlanCard({ plan, horseCount, horseLimit, isLimited }: {
  plan: string; horseCount: number; horseLimit: number | null; isLimited: boolean;
}) {
  const isPro = plan === 'pro';
  const pct = horseLimit ? Math.min((horseCount / horseLimit) * 100, 100) : 0;

  if (isPro) {
    return (
      <LinearGradient
        colors={['#241910', '#5f3f18', '#a87330']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.planPro}
      >
        <View style={s.planProTop}>
          <View style={s.planProBadge}>
            <Crown size={13} color="#241910" strokeWidth={2.5} />
            <Text style={s.planProBadgeText}>PRO</Text>
          </View>
        </View>
        <Text style={s.planProTitle}>Acceso ilimitado</Text>
        <Text style={s.planProSub}>{horseCount} caballos · todas las funciones</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={s.planFree}>
      <View style={s.planProTop}>
        <View style={s.planFreeBadge}>
          <Text style={s.planFreeBadgeText}>Gratis</Text>
        </View>
        <Text style={s.planFreeUsage}>{horseCount}{horseLimit ? `/${horseLimit}` : ''} caballos</Text>
      </View>
      {horseLimit && (
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: isLimited ? colors.amber600 : colors.brand }]} />
        </View>
      )}
      <Text style={s.planFreeMsg}>
        {isLimited ? 'Límite alcanzado. Pasate a Pro para caballos ilimitados.' : 'Pasate a Pro para caballos ilimitados.'}
      </Text>
    </View>
  );
}

/* ─── Admin User Row ─── */

function AdminUserRow({ u, onActivate, onRevoke, isPending }: {
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
    <View style={s.adminRow}>
      <View style={s.adminRowTop}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.adminRowName} numberOfLines={1}>{u.name}</Text>
          <Text style={s.adminRowEmail} numberOfLines={1}>{u.email}</Text>
          <Text style={s.adminRowMeta}>{ROLE_LABELS[u.role] ?? u.role} · {u.horse_count} caballos</Text>
        </View>
        <View style={[s.planPill, isPro ? s.planPillPro : s.planPillFree]}>
          <Text style={[s.planPillText, isPro ? s.planPillTextPro : s.planPillTextFree]}>
            {isPro ? 'Pro' : 'Gratis'}
          </Text>
        </View>
      </View>
      {isPro && expiresStr && <Text style={s.adminExpires}>Vence: {expiresStr}</Text>}
      {!isPro && (
        <>
          <TouchableOpacity onPress={() => setShowMonths((p) => !p)} style={s.monthsToggle}>
            <Text style={s.monthsToggleText}>Duración: {months} {months === 1 ? 'mes' : 'meses'} ▾</Text>
          </TouchableOpacity>
          {showMonths && (
            <View style={s.monthsGrid}>
              {MONTHS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { setMonths(opt.value); setShowMonths(false); }}
                  style={[s.monthsOption, months === opt.value && s.monthsOptionActive]}
                >
                  <Text style={[s.monthsOptionText, months === opt.value && s.monthsOptionTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={s.activateBtn} onPress={() => onActivate(u.id, months)} disabled={isPending} activeOpacity={0.85}>
            {isPending
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Text style={s.activateBtnText}>Activar Pro</Text>
            }
          </TouchableOpacity>
        </>
      )}
      {isPro && (
        <TouchableOpacity
          style={s.revokeBtn}
          onPress={() => Alert.alert('Revocar Pro', `¿Querés quitar el plan Pro a ${u.name}?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Revocar', style: 'destructive', onPress: () => onRevoke(u.id) },
          ])}
          disabled={isPending}
          activeOpacity={0.85}
        >
          <Text style={s.revokeBtnText}>Revocar Pro</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ─── Main Screen ─── */

function EditProfileModal({ visible, user, onClose }: {
  visible: boolean;
  user: { name: string; email: string };
  onClose: () => void;
}) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre no puede estar vacío'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); return; }
    setError('');
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), email: email.trim().toLowerCase() });
      onClose();
    } catch {
      setError('No se pudo actualizar el perfil. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={s.editModalSheet} entering={SlideInDown.springify().damping(20).stiffness(170)}>
          <View style={s.editModalHandle} />
          <Text style={s.editModalTitle}>Editar perfil</Text>
          {error ? <Text style={s.editModalError}>{error}</Text> : null}
          <View style={s.editField}>
            <Text style={s.editLabel}>Nombre</Text>
            <TextInput
              style={s.editInput}
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.gray400}
              autoCapitalize="words"
            />
          </View>
          <View style={s.editField}>
            <Text style={s.editLabel}>Email</Text>
            <TextInput
              style={s.editInput}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={[s.editSaveBtn, saving && s.editSaveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.editSaveBtnText}>Guardar cambios</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.editCancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.editCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!current || !newPass || !confirm) { setError('Completá todos los campos'); return; }
    if (newPass.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    if (newPass !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setError('');
    setSaving(true);
    try {
      await changePassword(current, newPass);
      Alert.alert('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.');
      setCurrent(''); setNewPass(''); setConfirm('');
      onClose();
    } catch {
      setError('Contraseña actual incorrecta o error del servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
        <Animated.View style={s.editModalSheet} entering={SlideInDown.springify().damping(20).stiffness(170)}>
          <View style={s.editModalHandle} />
          <Text style={s.editModalTitle}>Cambiar contraseña</Text>
          {error ? <Text style={s.editModalError}>{error}</Text> : null}
          {[
            { label: 'Contraseña actual', value: current, setter: setCurrent },
            { label: 'Nueva contraseña', value: newPass, setter: setNewPass },
            { label: 'Confirmar nueva contraseña', value: confirm, setter: setConfirm },
          ].map((f) => (
            <View key={f.label} style={s.editField}>
              <Text style={s.editLabel}>{f.label}</Text>
              <TextInput
                style={s.editInput}
                value={f.value}
                onChangeText={f.setter}
                secureTextEntry
                placeholderTextColor={colors.gray400}
                placeholder="••••••••"
                autoComplete="off"
                textContentType="oneTimeCode"
              />
            </View>
          ))}
          <TouchableOpacity
            style={[s.editSaveBtn, saving && s.editSaveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.editSaveBtnText}>Guardar contraseña</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.editCancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.editCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: planStatus } = usePlanStatus();
  const { data: adminUsers, isLoading: loadingAdminUsers } = useAdminPlanUsers(user?.role === 'admin');
  const setPlan = useAdminSetPlan();
  const [adminSearch, setAdminSearch] = useState('');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) return null;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const isAdmin = user.role === 'admin';
  const showPlan = user.role === 'propietario' || user.role === 'establecimiento';

  const filteredAdminUsers = adminUsers?.filter((u) =>
    adminSearch
      ? u.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(adminSearch.toLowerCase())
      : true,
  );

  const handleLogout = () => {
    // En web (preview), Alert.alert no ejecuta los botones — usamos confirm del navegador.
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('¿Querés cerrar tu sesión?')) logout();
      return;
    }
    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: space[10] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.userName}>{user.name}</Text>
          <Text style={s.userEmail}>{user.email}</Text>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{ROLE_LABELS[user.role] ?? user.role}</Text>
          </View>
        </View>

        <View style={s.sheet}>
          {/* Plan */}
          {showPlan && planStatus && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Mi plan</Text>
              <PlanCard
                plan={planStatus.plan}
                horseCount={planStatus.horse_count}
                horseLimit={planStatus.horse_limit}
                isLimited={planStatus.is_limited}
              />
            </View>
          )}

          {/* Gestión de planes (solo admin) */}
          {isAdmin && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Gestión de planes</Text>
              <Text style={s.sectionSubtitle}>Activá o revocá el plan Pro para propietarios y establecimientos.</Text>
              <TextInput
                style={s.searchInput}
                value={adminSearch}
                onChangeText={setAdminSearch}
                placeholder="Buscar por nombre o email..."
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {loadingAdminUsers ? (
                <ActivityIndicator size="small" color={colors.brand} style={{ marginTop: space[3] }} />
              ) : !filteredAdminUsers?.length ? (
                <Text style={s.emptyText}>No hay usuarios registrados.</Text>
              ) : (
                <View style={{ gap: space[3] }}>
                  {filteredAdminUsers.map((u, index) => (
                    <Animated.View key={u.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <AdminUserRow
                        u={u}
                        onActivate={(userId, months) => setPlan.mutate({ userId, plan: 'pro', months })}
                        onRevoke={(userId) => setPlan.mutate({ userId, plan: 'free' })}
                        isPending={setPlan.isPending}
                      />
                    </Animated.View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Account settings */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Mi cuenta</Text>
            <View style={s.accountCard}>
              <TouchableOpacity
                style={s.accountRow}
                onPress={() => setShowEditProfile(true)}
                activeOpacity={0.8}
              >
                <User size={18} color={colors.gray900} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={s.accountRowLabel}>Editar datos personales</Text>
                  <Text style={s.accountRowSub}>{user.name} · {user.email}</Text>
                </View>
                <ChevronRight size={16} color={colors.gray400} strokeWidth={2} />
              </TouchableOpacity>
              <View style={s.accountDivider} />
              <TouchableOpacity
                style={s.accountRow}
                onPress={() => setShowChangePassword(true)}
                activeOpacity={0.8}
              >
                <Lock size={18} color={colors.gray900} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={s.accountRowLabel}>Cambiar contraseña</Text>
                </View>
                <ChevronRight size={16} color={colors.gray400} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={18} color={colors.red500} strokeWidth={2} />
            <Text style={s.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>

      {user && (
        <>
          <EditProfileModal
            visible={showEditProfile}
            user={user}
            onClose={() => setShowEditProfile(false)}
          />
          <ChangePasswordModal
            visible={showChangePassword}
            onClose={() => setShowChangePassword(false)}
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },

  hero: {
    alignItems: 'center',
    gap: space[1] + 2,
    backgroundColor: colors.brand,
    paddingBottom: space[10],
    paddingTop: space[5],
    paddingHorizontal: space[5],
  },
  sheet: {
    backgroundColor: colors.gray50,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: space[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: text.xl, fontWeight: weight.extrabold, color: colors.white },
  userName: { fontSize: text.base, fontWeight: weight.extrabold, color: colors.white },
  userEmail: { fontSize: text.sm, color: 'rgba(255,255,255,0.55)' },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.full,
    paddingHorizontal: space[3], paddingVertical: space[1],
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  roleText: { fontSize: 10, fontWeight: weight.bold, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[1] + 2, paddingVertical: space[3],
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: colors.brand },
  tabLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray400 },
  tabLabelActive: { color: colors.brand },

  /* My posts */
  postsList: { padding: space[4], gap: space[3] },
  postCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.gray100,
    overflow: 'hidden',
    ...shadow.sm,
  },
  postThumb: { width: '100%', height: 160 },
  postBody: { padding: space[3], gap: space[1] + 2 },
  postContent: { fontSize: text.sm, color: colors.gray800, lineHeight: 20 },
  postHorse: { fontSize: text.xs, color: colors.gray500 },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[1] },
  postStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postStatText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray500 },
  postTime: { fontSize: text.xs, color: colors.gray400, marginLeft: 'auto' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyActivity: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[2], paddingHorizontal: space[8], paddingTop: 60 },
  emptyActivityTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray700 },
  emptyActivitySub: { fontSize: text.sm, color: colors.gray400, textAlign: 'center', lineHeight: 20 },

  section: { gap: space[2] + 2, paddingHorizontal: space[5], marginTop: space[5] },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  sectionSubtitle: { fontSize: text.sm, color: colors.gray500 },
  emptyText: { fontSize: text.sm, color: colors.gray400 },
  searchInput: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50,
  },

  // Plan Pro (gradiente premium)
  planPro: { borderRadius: radius.xl, padding: space[4] + 2, overflow: 'hidden' },
  planProTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] },
  planProBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e8c787', borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3 },
  planProBadgeText: { fontSize: text.xs, fontWeight: weight.bold, color: '#241910', letterSpacing: 1 },
  planProTitle: { fontSize: text.lg, fontWeight: weight.bold, color: colors.white },
  planProSub: { fontSize: text.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  // Plan Free
  planFree: { backgroundColor: colors.white, borderRadius: radius.xl, padding: space[4], gap: space[2], borderWidth: 1, borderColor: colors.gray100 },
  planFreeBadge: { backgroundColor: colors.gray100, borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] },
  planFreeBadgeText: { fontSize: text.xs, fontWeight: weight.bold, color: colors.gray600 },
  planFreeUsage: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  progressTrack: { height: 6, backgroundColor: colors.gray100, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  planFreeMsg: { fontSize: text.xs, color: colors.gray400 },

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
    paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: colors.gray50,
  },
  monthsToggleText: { fontSize: text.sm, color: colors.gray700 },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  monthsOption: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200,
    paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: colors.white,
  },
  monthsOptionActive: { borderColor: colors.brand, backgroundColor: '#eff6ff' },
  monthsOptionText: { fontSize: text.sm, color: colors.gray600 },
  monthsOptionTextActive: { color: colors.brand, fontWeight: weight.semibold },
  activateBtn: { backgroundColor: colors.amber600, borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  activateBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  revokeBtn: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    paddingVertical: space[3], alignItems: 'center', backgroundColor: colors.gray50,
  },
  revokeBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: colors.gray500 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200,
    paddingVertical: space[3] + 2, marginHorizontal: space[4], marginTop: space[5],
  },
  logoutText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.red500 },

  accountCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingHorizontal: space[4], paddingVertical: space[4],
  },
  accountRowLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  accountRowSub: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  accountDivider: { height: 1, backgroundColor: colors.gray100, marginHorizontal: space[4] },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  editModalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: space[6], paddingBottom: space[8],
    gap: space[3],
    marginTop: 'auto',
  },
  editModalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200,
    alignSelf: 'center', marginBottom: space[2],
  },
  editModalTitle: { fontSize: text.lg, fontWeight: weight.bold, color: colors.gray900 },
  editModalError: { fontSize: text.sm, color: colors.red700, backgroundColor: '#fef2f2', padding: space[3], borderRadius: radius.md },
  editField: { gap: space[1] + 2 },
  editLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  editInput: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.lg,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50,
  },
  editSaveBtn: {
    backgroundColor: colors.brand, borderRadius: radius.lg,
    paddingVertical: space[4], alignItems: 'center', marginTop: space[2],
  },
  editSaveBtnDisabled: { opacity: 0.6 },
  editSaveBtnText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },
  editCancelBtn: { alignItems: 'center', paddingVertical: space[2] },
  editCancelText: { fontSize: text.sm, color: colors.gray400, fontWeight: weight.medium },
});

import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
  Alert, Share,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { CheckCircle2, Share2, X, XCircle } from 'lucide-react-native';
import {
  useMyOrganizations, useOrganization, useOrgInvitations,
  useCreateInvitation, useCancelInvitation, useRemoveMember,
  ROLE_LABELS, PLAN_LABELS, type OrgRole,
} from '../hooks/use-organizations';
import { useAuth } from '../lib/auth';
import { ScreenHeader } from '../components/ScreenHeader';
import { Routes } from '../lib/routes';
import { EmptyState } from '../components/EmptyState';
import { ListRowSkeleton } from '../components/Skeleton';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { avatarColor, initialsOf } from '../lib/avatar-color';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight } from '../styles/tokens';

const ROLE_OPTIONS: { value: OrgRole; label: string; desc: string }[] = [
  { value: 'staff',      label: 'Staff',          desc: 'Cuidador / personal del establecimiento' },
  { value: 'owner_role', label: 'Propietario',    desc: 'Solo ve sus caballos' },
  { value: 'vet',        label: 'Veterinario',    desc: 'Ve los caballos asignados' },
  { value: 'admin',      label: 'Administrador',  desc: 'Control total de la organización' },
];

function getInviteUrl(token: string): string {
  const base = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://app.handicapp.com').replace(/\/$/, '');
  return `${base}/invitacion/${token}`;
}

function InviteModal({ orgId, onClose, c, s }: { orgId: string; onClose: () => void; c: ThemeColors; s: Styles }) {
  const create = useCreateInvitation(orgId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('staff');
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    const inv = await create.mutateAsync({ email: email.trim().toLowerCase(), role_in_org: role });
    haptic.success();
    setCreatedLink(getInviteUrl(inv.token));
  };

  const shareLink = async () => {
    if (!createdLink) return;
    await Share.share({ message: `Te invito a HandicApp: ${createdLink}` });
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={s.modalSheet} entering={SlideInDown.springify().damping(26).stiffness(190)}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{createdLink ? 'Invitación lista' : 'Invitar miembro'}</Text>
            <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
          </View>

          {!createdLink ? (
            <>
              <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={s.fieldLabel}>Email *</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ejemplo@email.com"
                  placeholderTextColor={c.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />

                <Text style={[s.fieldLabel, { marginTop: 12 }]}>Rol</Text>
                <View style={{ gap: 8 }}>
                  {ROLE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.roleCard, role === opt.value && s.roleCardActive]}
                      onPress={() => { haptic.selection(); setRole(opt.value); }}
                      activeOpacity={0.75}
                    >
                      <View style={[s.radio, role === opt.value && s.radioActive]}>
                        {role === opt.value && <View style={s.radioDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.roleCardTitle, role === opt.value && s.roleCardTitleActive]}>{opt.label}</Text>
                        <Text style={s.roleCardDesc}>{opt.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={s.modalFooter}>
                <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={onClose}>
                  <Text style={s.btnSecondaryText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.btn, s.btnPrimary, { flex: 1 }, (!email.trim() || create.isPending) && { opacity: 0.5 }]}
                  disabled={!email.trim() || create.isPending}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                >
                  {create.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnPrimaryText}>Generar</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={s.modalBody}>
                <View style={s.successIcon}>
                  <CheckCircle2 size={48} color="#16a34a" strokeWidth={2} />
                </View>
                <Text style={{ fontSize: text.sm, color: c.textMuted, textAlign: 'center', marginBottom: 12 }}>
                  Compartí este link con la persona invitada. Válido por 7 días.
                </Text>
                <View style={s.linkBox}>
                  <Text style={s.linkText} numberOfLines={2}>{createdLink}</Text>
                </View>
              </View>
              <View style={s.modalFooter}>
                <TouchableOpacity style={[s.btn, s.btnPrimary, { flex: 1 }]} onPress={shareLink}>
                  <Text style={s.btnPrimaryText}>Compartir link</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function OrganizacionScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: myOrgs, isLoading: loadingOrgs } = useMyOrganizations();
  const orgId = myOrgs?.[0]?.id ?? null;
  const { data: org, isLoading: loadingOrg } = useOrganization(orgId);
  const { data: invitations } = useOrgInvitations(orgId);
  const cancelInv = useCancelInvitation(orgId ?? '');
  const removeMember = useRemoveMember(orgId ?? '');
  const [showInvite, setShowInvite] = useState(false);

  const myMember = org?.members.find((m) => m.user_id === user?.id);
  const isAdmin = myMember?.role_in_org === 'admin' || (org && org.owner_id === user?.id);

  if (loadingOrgs || loadingOrg) {
    return (
      <View style={s.root}>
        <ScreenHeader title="Organización" showBack backTo={Routes.mas} />
        <View style={{ padding: space[4], gap: space[2] }}>
          {Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  if (!org) {
    return (
      <View style={s.root}>
        <ScreenHeader title="Organización" showBack backTo={Routes.mas} />
        <EmptyState
          icon="business-outline"
          title="No pertenecés a una organización"
          message="Las organizaciones permiten a los establecimientos gestionar propietarios y vets bajo un mismo plan."
        />
      </View>
    );
  }

  const horseLimit = org.horse_limit;
  const pct = horseLimit ? Math.min((org.horse_count / horseLimit) * 100, 100) : 0;

  return (
    <View style={s.root}>
      <ScreenHeader title="Organización" showBack backTo={Routes.mas} />

      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: 40, gap: space[4] }} showsVerticalScrollIndicator={false}>
        {/* Card principal */}
        <View style={s.heroCard}>
          <Text style={s.orgName}>{org.name}</Text>
          <View style={[s.badge, org.plan === 'free' ? s.badgeGray : s.badgeGold]}>
            <Text style={[s.badgeText, org.plan === 'free' ? s.badgeTextGray : s.badgeTextGold]}>
              {PLAN_LABELS[org.plan]}
            </Text>
          </View>
          {horseLimit && (
            <View style={{ marginTop: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: text.xs, color: c.textMuted }}>
                  {org.horse_count} de {horseLimit} caballos
                </Text>
                <Text style={{ fontSize: text.xs, fontWeight: weight.semibold, color: pct >= 80 ? colors.amber600 : c.textMuted }}>
                  {Math.round(pct)}%
                </Text>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, {
                  width: `${pct}%` as any,
                  backgroundColor: pct >= 100 ? colors.red500 : pct >= 80 ? colors.amber600 : c.brand,
                }]} />
              </View>
            </View>
          )}
        </View>

        {/* Invitaciones pendientes */}
        {invitations && invitations.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={s.sectionLabel}>Invitaciones pendientes ({invitations.length})</Text>
            {invitations.map((inv, index) => (
              <Animated.View key={inv.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={s.invCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.invEmail}>{inv.email}</Text>
                  <Text style={s.invMeta}>{ROLE_LABELS[inv.role_in_org]} · expira {new Date(inv.expires_at).toLocaleDateString('es-AR')}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => Share.share({ message: `Te invito a HandicApp: ${getInviteUrl(inv.token)}` })}
                    style={s.invBtn}
                  >
                    <Share2 size={14} color={c.brand} strokeWidth={2} />
                  </TouchableOpacity>
                  {isAdmin && (
                    <TouchableOpacity onPress={() => cancelInv.mutate(inv.id)} style={s.invBtn}>
                      <X size={14} color={colors.red500} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Miembros */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={s.sectionLabel}>Miembros ({org.members.length})</Text>
            {isAdmin && (
              <TouchableOpacity
                style={s.inviteBtn}
                onPress={() => { haptic.medium(); setShowInvite(true); }}
                activeOpacity={0.85}
              >
                <Text style={s.inviteBtnText}>+ Invitar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ gap: 8 }}>
            {org.members.map((m, index) => {
              const isOrgOwner = m.user_id === org.owner_id;
              return (
                <Animated.View key={m.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={s.memberCard}>
                  <View style={[s.memberAvatar, { backgroundColor: avatarColor(m.user.name, m.user.avatar_color) }]}>
                    <Text style={s.memberAvatarText}>{initialsOf(m.user.name)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.memberName} numberOfLines={1}>
                      {m.user.name}
                      {m.user_id === user?.id && <Text style={{ color: c.textFaint, fontSize: 10 }}> (vos)</Text>}
                    </Text>
                    <Text style={s.memberEmail} numberOfLines={1}>{m.user.email}</Text>
                  </View>
                  <View style={[s.roleBadge, isOrgOwner && s.roleBadgeOwner]}>
                    <Text style={[s.roleBadgeText, isOrgOwner && s.roleBadgeTextOwner]}>
                      {isOrgOwner ? 'Dueño' : ROLE_LABELS[m.role_in_org]}
                    </Text>
                  </View>
                  {isAdmin && !isOrgOwner && m.user_id !== user?.id && (
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Quitar miembro', `¿Quitar a ${m.user.name} de la organización?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Quitar', style: 'destructive', onPress: () => removeMember.mutate(m.id) },
                        ]);
                      }}
                    >
                      <XCircle size={18} color={c.textFaint} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {showInvite && orgId && <InviteModal orgId={orgId} onClose={() => setShowInvite(false)} c={c} s={s} />}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  sectionLabel: { fontSize: 11, fontWeight: weight.bold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },

  heroCard: { backgroundColor: c.surface, borderRadius: radius.xl, padding: space[4], borderWidth: 1, borderColor: c.borderStrong, shadowColor: '#0f1f3d', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  orgName: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, letterSpacing: -0.5 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeGray: { backgroundColor: c.surfaceAlt },
  badgeGold: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  badgeText: { fontSize: 11, fontWeight: weight.bold },
  badgeTextGray: { color: c.textMuted },
  badgeTextGold: { color: '#92400e' },

  progressTrack: { height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  invCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: radius.md, padding: space[3], borderWidth: 1, borderColor: '#fde68a' },
  invEmail: { fontSize: text.sm, fontWeight: weight.semibold, color: '#92400e' },
  invMeta: { fontSize: 11, color: '#b45309', marginTop: 1 },
  invBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center' },

  inviteBtn: { borderRadius: radius.md, backgroundColor: c.brand, paddingHorizontal: 12, paddingVertical: 6 },
  inviteBtnText: { fontSize: 11, fontWeight: weight.bold, color: colors.white },

  memberCard: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.surface, borderRadius: radius.lg, padding: space[3], borderWidth: 1, borderColor: c.borderStrong },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 14, fontWeight: weight.bold, color: colors.white },
  memberName: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  memberEmail: { fontSize: 11, color: c.textFaint, marginTop: 1 },
  roleBadge: { borderRadius: radius.full, backgroundColor: c.surfaceAlt, paddingHorizontal: 8, paddingVertical: 4 },
  roleBadgeOwner: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  roleBadgeText: { fontSize: 10, fontWeight: weight.semibold, color: c.textMuted },
  roleBadgeTextOwner: { color: '#92400e' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[5], borderBottomWidth: 1, borderBottomColor: c.border },
  modalTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  modalClose: { fontSize: 18, color: c.textFaint },
  modalBody: { padding: space[5], gap: space[2] },
  modalFooter: { flexDirection: 'row', gap: space[3], padding: space[4], borderTopWidth: 1, borderTopColor: c.border },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  input: { borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.sm, color: c.text, backgroundColor: c.surfaceAlt },

  roleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, padding: 12 },
  roleCardActive: { borderColor: c.brand, backgroundColor: 'rgba(15,31,61,0.04)' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: c.borderStrong, marginTop: 2, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: c.brand },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.brand },
  roleCardTitle: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  roleCardTitleActive: { color: c.brand },
  roleCardDesc: { fontSize: 11, color: c.textFaint, marginTop: 2, lineHeight: 16 },

  successIcon: { alignItems: 'center', marginBottom: 12 },
  linkBox: { backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 12 },
  linkText: { fontSize: 11, color: c.text, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },

  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  btnSecondary: { borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface },
  btnSecondaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
});
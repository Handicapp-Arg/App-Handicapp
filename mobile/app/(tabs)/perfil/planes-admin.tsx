import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useState, useMemo } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useAdminPlanUsers, useAdminSetPlan, type AdminPlanUser } from '../../../hooks/use-plan';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { fechaHumana } from '../../../lib/fechas';

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

function AdminUserRow({ u, onActivate, onRevoke, isPending, c, s }: {
  u: AdminPlanUser;
  onActivate: (userId: string, months: number) => void;
  onRevoke: (userId: string) => void;
  isPending: boolean;
  c: ThemeColors; s: Styles;
}) {
  const [months, setMonths] = useState(1);
  const [showMonths, setShowMonths] = useState(false);
  const isPro = u.plan === 'pro';
  const expiresStr = u.plan_expires_at ? fechaHumana(u.plan_expires_at) : null;

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
          <TouchableOpacity
            onPress={() => setShowMonths((p) => !p)}
            style={[s.monthsToggle, s.monthsToggleRow]}
            accessibilityRole="button"
            accessibilityLabel="Elegir duración del plan Pro"
          >
            <Text style={s.monthsToggleText}>Duración: {months} {months === 1 ? 'mes' : 'meses'}</Text>
            <ChevronDown size={16} color={c.textMuted} strokeWidth={2} />
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

export default function PlanesAdminScreen() {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: adminUsers, isLoading: loadingAdminUsers } = useAdminPlanUsers(true);
  const setPlan = useAdminSetPlan();
  const [adminSearch, setAdminSearch] = useState('');

  const filteredAdminUsers = adminUsers?.filter((u) =>
    adminSearch
      ? u.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(adminSearch.toLowerCase())
      : true,
  );

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Gestión de planes" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.section}>
          <Text style={s.sectionSubtitle}>Activá o revocá el plan Pro para propietarios y establecimientos.</Text>
          <TextInput
            style={s.searchInput}
            value={adminSearch}
            onChangeText={setAdminSearch}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor={c.textFaint}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {loadingAdminUsers ? (
            <ActivityIndicator size="small" color={c.brand} style={{ marginTop: space[3] }} />
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
                    c={c}
                    s={s}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { gap: space[2] + 2, paddingHorizontal: space[5], marginTop: space[5] },
  sectionSubtitle: { fontSize: text.sm, color: c.textMuted },
  emptyText: { fontSize: text.sm, color: c.textFaint },
  searchInput: {
    borderWidth: 1, borderColor: 'transparent', borderRadius: radius.md,
    paddingHorizontal: space[4], paddingVertical: space[3],
    fontSize: text.base, color: c.text, backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
  },

  adminRow: {
    gap: space[2] + 2,
    paddingVertical: space[3],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  adminRowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  adminRowName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  adminRowEmail: { fontSize: text.xs, color: c.textMuted, marginTop: 2 },
  adminRowMeta: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  adminExpires: { fontSize: text.xs, color: c.textFaint },
  planPill: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] },
  planPillFree: { backgroundColor: c.surfaceAlt },
  planPillPro: { backgroundColor: c.goldSoft },
  planPillText: { fontSize: text.xs, fontWeight: weight.bold },
  planPillTextFree: { color: c.textMuted },
  planPillTextPro: { color: c.goldText },
  monthsToggle: {
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[3], minHeight: touch.min,
    justifyContent: 'center', backgroundColor: c.surfaceAlt,
  },
  monthsToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthsToggleText: { fontSize: text.sm, color: c.text },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  monthsOption: {
    borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[3], minHeight: touch.min,
    justifyContent: 'center', backgroundColor: c.surfaceAlt,
  },
  monthsOptionActive: { backgroundColor: c.brandSoft },
  monthsOptionText: { fontSize: text.sm, color: c.textMuted },
  monthsOptionTextActive: { color: c.brand, fontWeight: weight.semibold },
  activateBtn: { backgroundColor: c.brand, borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  activateBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  revokeBtn: {
    borderRadius: radius.md,
    paddingVertical: space[3], alignItems: 'center', backgroundColor: c.surfaceAlt,
  },
  revokeBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
});

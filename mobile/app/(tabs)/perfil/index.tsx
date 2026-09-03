import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  User, ChevronRight, Phone, ShieldCheck, Users, Crown, type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { Routes } from '../../../lib/routes';
import { Avatar } from '../../../components/Avatar';
import { RoleBadge } from '../../../components/RoleBadge';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight, touch } from '../../../styles/tokens';
import { usePlanStatus } from '../../../hooks/use-plan';
import { VetVerifiedBadge, isVetVerified } from '../../../components/VerifiedBadge';

const LICENSE_LABELS: Record<string, string> = {
  none: 'Sin cargar',
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

/* ─── Fila de sección estilo Ajustes ─── */
function SectionRow({ Icon, label, sub, onPress, c, s }: {
  Icon: LucideIcon; label: string; sub?: string; onPress: () => void; c: ThemeColors; s: Styles;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={label}>
      <View style={s.rowIconWrap}>
        <Icon size={20} color={c.text} strokeWidth={1.7} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

export default function PerfilScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, preference, setPreference } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: planStatus } = usePlanStatus();

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isVet = user.role === 'veterinario';
  const showPlan = user.role === 'propietario' || user.role === 'establecimiento';

  const goto = (path: string) => { haptic.selection(); router.push(`/perfil/${path}` as never); };

  const planLabel = planStatus
    ? planStatus.plan === 'pro'
      ? 'Pro · acceso ilimitado'
      : `Gratis · ${planStatus.horse_count}${planStatus.horse_limit ? `/${planStatus.horse_limit}` : ''} caballos`
    : undefined;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: identidad — jerarquía intacta */}
        <View style={s.hero}>
          <Avatar name={user.name} avatarColor={user.avatar_color} size={68} ring />
          <View style={s.userNameRow}>
            <Text style={s.userName}>{user.name}</Text>
            {isVetVerified(user) && <VetVerifiedBadge size="md" />}
          </View>
          <Text style={s.userEmail}>{user.email}</Text>
          <RoleBadge role={user.role} />
        </View>

        <View style={s.sheet}>
          {/* Mi plan — una fila tocable, resume el estado y empuja a mi-plan */}
          {showPlan && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Mi plan</Text>
              <TouchableOpacity
                style={s.planRow}
                onPress={() => { haptic.selection(); router.push(Routes.miPlan as never); }}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityLabel="Ver mi plan"
              >
                <View style={s.rowIconWrap}>
                  <Crown size={18} color={planStatus?.plan === 'pro' ? c.brand : c.textMuted} strokeWidth={1.9} />
                </View>
                <Text style={[s.rowLabel, { flex: 1 }]} numberOfLines={1}>{planLabel ?? 'Ver mi plan'}</Text>
                <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}

          {/* Apariencia — control rápido, se queda inline */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Apariencia</Text>
            <View style={s.themeSegment}>
              {([['auto','Automático'],['light','Claro'],['dark','Oscuro']] as const).map(([value,label]) => {
                const active = preference === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[s.themeSegmentBtn, active && s.themeSegmentBtnActive]}
                    onPress={() => { haptic.selection(); setPreference(value); }}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Tema ${label}`}
                  >
                    <Text style={[s.themeSegmentText, active && s.themeSegmentTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Lista de secciones — se navegan, no se apilan acá */}
          <View style={s.sectionsList}>
            <SectionRow
              Icon={User}
              label="Mi cuenta"
              sub={`${user.name} · ${user.email}`}
              onPress={() => goto('cuenta')}
              c={c} s={s}
            />
            <SectionRow
              Icon={Phone}
              label="Contacto y WhatsApp"
              sub={user.phone ?? 'Sin teléfono cargado'}
              onPress={() => goto('contacto')}
              c={c} s={s}
            />
            {isVet && (
              <SectionRow
                Icon={ShieldCheck}
                label="Matrícula profesional"
                sub={LICENSE_LABELS[user.vet_license_status ?? 'none']}
                onPress={() => goto('matricula')}
                c={c} s={s}
              />
            )}
            {isAdmin && (
              <SectionRow
                Icon={Users}
                label="Gestión de planes"
                sub="Activar y revocar plan Pro"
                onPress={() => goto('planes-admin')}
                c={c} s={s}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  themeSegment: {
    flexDirection: 'row', gap: space[1], padding: 3,
    backgroundColor: c.surfaceAlt, borderRadius: 14,
  },
  themeSegmentBtn: {
    flex: 1, minHeight: touch.min, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  themeSegmentBtnActive: {
    backgroundColor: c.surface,
    ...(c.isDark ? {} : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }),
  },
  themeSegmentText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  themeSegmentTextActive: { color: c.text, fontWeight: weight.semibold },

  hero: {
    alignItems: 'center',
    gap: space[1] + 2,
    backgroundColor: c.brand,
    paddingBottom: space[10],
    paddingTop: space[5],
    paddingHorizontal: space[5],
  },
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingTop: space[4],
    paddingBottom: space[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: text.base, fontWeight: weight.extrabold, color: colors.white },
  userEmail: { fontSize: text.sm, color: 'rgba(255,255,255,0.55)' },

  section: { gap: space[2] + 2, paddingHorizontal: space[5], marginTop: space[5] },
  sectionTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },

  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 52,
  },

  sectionsList: { marginHorizontal: space[5], marginTop: space[5] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowIconWrap: { width: 28, alignItems: 'center', flexShrink: 0 },
  rowLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  rowSub: { fontSize: 12, color: c.textFaint, marginTop: 1 },
});

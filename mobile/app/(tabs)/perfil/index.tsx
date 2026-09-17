import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  User, ChevronRight, Phone, ShieldCheck, Users, Crown, Check, type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { Routes } from '../../../lib/routes';
import { Avatar } from '../../../components/Avatar';
import { RoleBadge } from '../../../components/RoleBadge';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FilaSelector } from '../../../components/FilaSelector';
import { BottomSheet } from '../../../components/BottomSheet';
import { useTheme, type ThemeColors, type ThemePreference } from '../../../lib/theme';
import { space, text, weight, touch } from '../../../styles/tokens';
import { usePlanStatus } from '../../../hooks/use-plan';
import { VetVerifiedBadge, isVetVerified } from '../../../components/VerifiedBadge';

const LICENSE_LABELS: Record<string, string> = {
  none: 'Sin cargar',
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

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
  const [themeSheet, setThemeSheet] = useState(false);

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

  const themeLabel = THEME_OPTIONS.find((o) => o.value === preference)?.label;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader scrollable title="Perfil" />

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

          {/* Apariencia — fila con el valor actual, abre la hoja de opciones */}
          <View style={s.section}>
            <FilaSelector
              primera
              label="Apariencia"
              valor={themeLabel}
              onPress={() => setThemeSheet(true)}
            />
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

      <BottomSheet visible={themeSheet} onClose={() => setThemeSheet(false)} title="Apariencia">
        <View style={s.themeLista}>
          {THEME_OPTIONS.map((opt, i) => {
            const active = preference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.themeItem, i > 0 && s.themeItemBorde]}
                onPress={() => { haptic.selection(); setPreference(opt.value); setThemeSheet(false); }}
                activeOpacity={0.6}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Tema ${opt.label}`}
              >
                <Text style={s.themeItemText}>{opt.label}</Text>
                {active && <Check size={19} color={c.brand} strokeWidth={2.4} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  hero: {
    alignItems: 'center',
    gap: space[1] + 2,
    paddingBottom: space[5],
    paddingTop: space[2],
    paddingHorizontal: space[5],
  },
  sheet: {
    paddingTop: space[2],
    paddingBottom: space[6],
  },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.4 },
  userEmail: { fontSize: text.sm, color: c.textMuted },

  section: { gap: space[2] + 2, paddingHorizontal: space[5], marginTop: space[5] },
  sectionTitle: {
    fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint,
    textTransform: 'uppercase', letterSpacing: 1,
  },

  planRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },

  sectionsList: { marginHorizontal: space[5], marginTop: space[5] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowIconWrap: { width: 28, alignItems: 'center', flexShrink: 0 },
  rowLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  rowSub: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },

  // Opciones de tema: filas planas sobre la hoja, separadas por hairline.
  themeLista: { paddingBottom: space[1] },
  themeItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: touch.min + 6, paddingHorizontal: space[1], gap: space[3],
  },
  themeItemBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  themeItemText: { fontSize: text.md, color: c.text, letterSpacing: -0.2 },
});

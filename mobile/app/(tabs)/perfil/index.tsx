import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import Constants from 'expo-constants';
import {
  User, ChevronRight, Phone, ShieldCheck, Users, CreditCard, Check,
  Sun, type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { Routes } from '../../../lib/routes';
import { Avatar } from '../../../components/Avatar';
import { RoleBadge } from '../../../components/RoleBadge';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { Skeleton } from '../../../components/Skeleton';
import { BottomSheet } from '../../../components/BottomSheet';
import { useTheme, type ThemeColors, type ThemePreference } from '../../../lib/theme';
import { useCommonStyles } from '../../../styles/common';
import { entradaFila } from '../../../styles/motion';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
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

/** Versión que muestra el pie: la del `app.json`, nunca una constante a mano. */
const APP_VERSION = Constants.expoConfig?.version ?? '';

/* ─── Fila de sección estilo Ajustes ─── */
function SectionRow({ Icon, label, valor, onPress, ultima, c, s }: {
  Icon: LucideIcon; label: string; valor?: string; onPress: () => void;
  ultima?: boolean; c: ThemeColors; s: Styles;
}) {
  return (
    <PressableScale
      style={[s.row, !ultima && s.rowBorde]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={valor ? `${label}: ${valor}` : label}
    >
      <View style={s.rowIconWrap}>
        <Icon size={21} color={c.text} strokeWidth={1.9} />
      </View>
      <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
      {valor ? <Text style={s.rowValor} numberOfLines={1}>{valor}</Text> : null}
      <ChevronRight size={17} color={c.textFaint} strokeWidth={2.3} />
    </PressableScale>
  );
}

/** Una celda del bloque de números. Los tres comparten forma para que el ojo
 *  los lea como una sola tira, no como tres tarjetas. */
function Stat({ valor, label, s }: { valor: string; label: string; s: Styles }) {
  return (
    <View style={s.statCell}>
      <Text style={s.statValor}>{valor}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { c, preference, setPreference } = useTheme();
  const { typography } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: planStatus, isLoading: cargandoPlan } = usePlanStatus();
  const [themeSheet, setThemeSheet] = useState(false);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isVet = user.role === 'veterinario';
  const showPlan = user.role === 'propietario' || user.role === 'establecimiento';

  const goto = (path: string) => { haptic.selection(); router.push(`/perfil/${path}` as never); };

  const themeLabel = THEME_OPTIONS.find((o) => o.value === preference)?.label;

  // Filas de la lista, armadas antes de pintar para que el escalonado use un
  // índice corrido aunque el rol saque filas del medio.
  const filas: { key: string; Icon: LucideIcon; label: string; valor?: string; onPress: () => void }[] = [
    { key: 'cuenta', Icon: User, label: 'Datos personales', onPress: () => goto('cuenta') },
    {
      key: 'contacto', Icon: Phone, label: 'Contacto y avisos',
      valor: user.phone ?? 'Sin cargar',
      onPress: () => goto('contacto'),
    },
    ...(showPlan ? [{
      key: 'plan', Icon: CreditCard, label: 'Mi plan',
      valor: planStatus?.label,
      onPress: () => { haptic.selection(); router.push(Routes.miPlan as never); },
    }] : []),
    ...(isVet ? [{
      key: 'matricula', Icon: ShieldCheck, label: 'Matrícula profesional',
      valor: LICENSE_LABELS[user.vet_license_status ?? 'none'],
      onPress: () => goto('matricula'),
    }] : []),
    ...(isAdmin ? [{
      key: 'planes-admin', Icon: Users, label: 'Gestión de planes',
      onPress: () => goto('planes-admin'),
    }] : []),
    {
      key: 'apariencia', Icon: Sun, label: 'Apariencia',
      valor: themeLabel,
      onPress: () => { haptic.selection(); setThemeSheet(true); },
    },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          scrollable
          showBack
          backTo={Routes.mas}
          title="Perfil"
          right={(
            <TouchableOpacity
              onPress={() => { haptic.selection(); router.push(Routes.perfilEditar as never); }}
              style={s.editarBtn}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel="Editar mis datos"
            >
              <Text style={s.editarBtnText}>Editar</Text>
            </TouchableOpacity>
          )}
        />

        {/* Hero: identidad centrada */}
        <Animated.View entering={entradaFila(0)} style={s.hero}>
          <Avatar name={user.name} avatarColor={user.avatar_color} size={92} />
          <View style={s.userNameRow}>
            <Text style={s.userName}>{user.name}</Text>
            {isVetVerified(user) && <VetVerifiedBadge size="md" />}
          </View>
          <Text style={s.userEmail}>{user.email}</Text>
          <RoleBadge role={user.role} />
        </Animated.View>

        {/* Números del plan. Solo mostramos lo que manda `/plans/status`:
            el tamaño del equipo y la caballeriza no vienen en ningún endpoint
            que este rol pueda pedir, así que esas celdas no existen. */}
        {showPlan && (cargandoPlan || planStatus) && (
          <Animated.View entering={entradaFila(1)} style={s.stats}>
            {cargandoPlan || !planStatus ? (
              // Misma silueta que el resultado: dos números y sus etiquetas.
              <>
                <View style={s.statCell}>
                  <Skeleton width={32} height={24} />
                  <Skeleton width={56} height={11} style={{ marginTop: space[1] }} />
                </View>
                <View style={s.statDivider} />
                <View style={s.statCell}>
                  <Skeleton width={32} height={24} />
                  <Skeleton width={56} height={11} style={{ marginTop: space[1] }} />
                </View>
              </>
            ) : (
              <>
                <Stat valor={String(planStatus.horse_count)} label="caballos" s={s} />
                <View style={s.statDivider} />
                <Stat
                  valor={planStatus.horse_limit == null ? '∞' : String(planStatus.horse_limit)}
                  label="tope del plan"
                  s={s}
                />
              </>
            )}
          </Animated.View>
        )}

        <View style={s.section}>
          <Text style={[typography.sectionEyebrow, s.sectionTitle]}>Tu cuenta</Text>
          {filas.map((f, i) => (
            <Animated.View key={f.key} entering={entradaFila(i + 2)}>
              <SectionRow
                Icon={f.Icon}
                label={f.label}
                valor={f.valor}
                onPress={f.onPress}
                ultima={i === filas.length - 1}
                c={c} s={s}
              />
            </Animated.View>
          ))}

          <PressableScale
            style={s.logoutBtn}
            onPress={() => {
              haptic.medium();
              Alert.alert('Cerrar sesión', '¿Salir de tu cuenta?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Cerrar sesión', style: 'destructive', onPress: () => { void logout(); } },
              ]);
            }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Text style={s.logoutText}>Cerrar sesión</Text>
          </PressableScale>

          {APP_VERSION ? <Text style={s.version}>HandicApp {APP_VERSION}</Text> : null}
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

  editarBtn: { height: touch.min, justifyContent: 'center', paddingHorizontal: space[1] },
  editarBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: c.brand },

  hero: {
    alignItems: 'center',
    gap: space[1],
    paddingTop: space[4],
    paddingBottom: space[2],
    paddingHorizontal: space[5],
  },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space[2] },
  userName: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, letterSpacing: -0.8 },
  userEmail: { fontSize: text.base, color: c.textMuted, marginBottom: space[1] },

  stats: { flexDirection: 'row', paddingHorizontal: space[5], marginTop: space[5] },
  statCell: { flex: 1, alignItems: 'center' },
  statValor: {
    fontSize: text.lg, fontWeight: weight.bold, color: c.text,
    letterSpacing: -0.8, fontVariant: ['tabular-nums'],
  },
  statLabel: { fontSize: text.xs, color: c.textFaint, marginTop: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border },

  section: { paddingHorizontal: space[5], marginTop: space[7] },
  sectionTitle: { marginBottom: space[1] },

  row: {
    flexDirection: 'row', alignItems: 'center',
    minHeight: touch.field, gap: space[3] + 2,
  },
  rowBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowIconWrap: { width: 24, alignItems: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  rowValor: { fontSize: text.base, color: c.textFaint, maxWidth: 150 },

  // Botón destructivo en píldora: el rojo sutil de fondo ya avisa, sin borde.
  logoutBtn: {
    alignSelf: 'flex-start', marginTop: space[6],
    height: touch.min + 4, paddingHorizontal: space[5],
    borderRadius: radius.full, backgroundColor: c.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  logoutText: { fontSize: text.base, fontWeight: weight.semibold, color: c.danger },
  version: { fontSize: text.xs, color: c.textFaint, marginTop: space[4], fontVariant: ['tabular-nums'] },

  // Opciones de tema: filas planas sobre la hoja, separadas por hairline.
  themeLista: { paddingBottom: space[1] },
  themeItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: touch.min + 6, paddingHorizontal: space[1], gap: space[3],
  },
  themeItemBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  themeItemText: { fontSize: text.md, color: c.text, letterSpacing: -0.2 },
});

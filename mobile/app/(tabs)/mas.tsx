import { useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trophy, GitBranch, BookOpen, FileText, Receipt,
  Mail, Building2, Settings, ShieldCheck, ChevronRight,
  Map, type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors, type ThemePreference } from '../../lib/theme';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { Routes, nav } from '../../lib/routes';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  desc: string;
  path: string;
  badge?: number;
  iconColor?: string;
}

function MenuRow({ item, onPress, c, s }: { item: MenuItem; onPress: () => void; c: ThemeColors; s: Styles }) {
  const Icon = item.icon;
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.6}>
      <View style={s.iconWrap}>
        <Icon size={22} color={c.text} strokeWidth={2} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{item.label}</Text>
        <Text style={s.rowDesc} numberOfLines={1}>{item.desc}</Text>
      </View>
      {item.badge != null && item.badge > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
        </View>
      )}
      <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
    </TouchableOpacity>
  );
}

function Section({ title, items, onPress, c, s }: { title: string; items: MenuItem[]; onPress: (path: string) => void; c: ThemeColors; s: Styles }) {
  if (items.length === 0) return null;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>
        {items.map((item, idx) => (
          <Animated.View key={item.path} entering={FadeInDown.duration(320).delay(Math.min(idx, 8) * 45)}>
            {idx > 0 && <View style={s.divider} />}
            <MenuRow item={item} onPress={() => { haptic.light(); onPress(item.path); }} c={c} s={s} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

function AppearanceSection({ c, s }: { c: ThemeColors; s: Styles }) {
  const { preference, setPreference } = useTheme();
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Apariencia</Text>
      <View style={s.segment}>
        {THEME_OPTIONS.map((opt) => {
          const active = preference === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[s.segmentBtn, active && s.segmentBtnActive]}
              onPress={() => { haptic.selection(); setPreference(opt.value); }}
              activeOpacity={0.85}
            >
              <Text style={[s.segmentText, active && s.segmentTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const role = user?.role ?? '';
  const isProp  = role === 'propietario';
  const isEstab = role === 'establecimiento';
  const isAdmin = role === 'admin';
  const ROLE_LABEL: Record<string, string> = {
    propietario: 'Propietario', establecimiento: 'Establecimiento',
    veterinario: 'Veterinario', admin: 'Administrador',
  };

  const push = (path: string) => nav.push(router, path);
  const roleLabel = ROLE_LABEL[role] ?? role;

  const principal: MenuItem[] = [
    {
      icon: Trophy,
      label: 'Remates',
      desc: 'Comprá y vendé caballos en subastas',
      path: Routes.remates,
    },
    {
      icon: GitBranch,
      label: 'Árbol Genealógico',
      desc: 'Pedigree global de caballos desde 1990',
      path: Routes.arbol,
    },
    {
      icon: BookOpen,
      label: 'Padrón de caballos',
      desc: 'Registro oficial, pedigree y propietarios',
      path: Routes.padron,
    },
    {
      icon: FileText,
      label: 'Eventos',
      desc: 'Historial de carreras y actividades',
      path: Routes.tabsEventos,
    },
    {
      icon: Receipt,
      label: 'Facturación',
      desc: 'Facturas y pagos de pensión',
      path: Routes.tabsFacturacion,
    },
  ];

  const gestion: MenuItem[] = [
    ...(isEstab || isProp ? [{
      icon: FileText,
      label: 'Contratos',
      desc: 'Contratos de pensión y acuerdos',
      path: Routes.contratos,
    }] : []),
    ...(isEstab || isAdmin ? [{
      icon: Mail,
      label: 'Solicitudes de pensión',
      desc: 'Aceptá o rechazá solicitudes entrantes',
      path: Routes.solicitudes,
    }] : []),
    ...(isProp ? [{
      icon: Map,
      label: 'Directorio',
      desc: 'Encontrá establecimientos en HandicApp',
      path: Routes.directorio,
    }] : []),
    ...(isEstab || isAdmin ? [{
      icon: Building2,
      label: 'Organización',
      desc: 'Miembros, plan e invitaciones',
      path: Routes.organizacion,
    }] : []),
  ];

  const cuenta: MenuItem[] = [
    ...(isAdmin ? [{
      icon: Settings,
      label: 'Config. notificaciones',
      desc: 'Qué tipos de eventos notifican a cada rol',
      path: Routes.notificacionesConfig,
      iconColor: colors.gray500,
    }] : []),
    ...(isAdmin ? [{
      icon: ShieldCheck,
      label: 'Superadmin',
      desc: 'Métricas, planes y organizaciones',
      path: Routes.superadmin,
    }] : []),
  ];

  const initials = (user?.name ?? 'U').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + space[4] }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Tarjeta de perfil */}
      <TouchableOpacity
        style={s.profileCard}
        onPress={() => { haptic.light(); push('/(tabs)/perfil'); }}
        activeOpacity={0.7}
      >
        <View style={s.profileAvatar}>
          <Text style={s.profileAvatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.profileName} numberOfLines={1}>{user?.name ?? 'Mi perfil'}</Text>
          <Text style={s.profileRole}>{roleLabel}</Text>
        </View>
        <ChevronRight size={20} color={c.textFaint} strokeWidth={2} />
      </TouchableOpacity>

      <Section title="Principal" items={principal} onPress={push} c={c} s={s} />
      <Section title="Gestión" items={gestion} onPress={push} c={c} s={s} />
      <Section title="Cuenta" items={cuenta} onPress={push} c={c} s={s} />
      <AppearanceSection c={c} s={s} />
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: space[10], gap: space[1] },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.xl,
    paddingVertical: space[3], paddingHorizontal: space[3] + 2,
    marginHorizontal: space[4], marginBottom: space[4],
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2,
  },
  profileAvatar: {
    width: 50, height: 50, borderRadius: radius.full,
    backgroundColor: colors.gray900, alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { color: colors.white, fontSize: text.base, fontWeight: weight.bold },
  profileName: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  profileRole: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },

  section: { marginBottom: space[4], paddingHorizontal: space[4] },
  sectionTitle: {
    fontSize: text.xs,
    fontWeight: weight.bold,
    color: c.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: space[2],
    paddingHorizontal: space[1],
  },
  sectionCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    ...shadow.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3] + 2,
    gap: space[3],
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  rowDesc: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },

  badge: {
    backgroundColor: '#ef4444',
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: colors.white, fontSize: text.xs, fontWeight: weight.bold },

  divider: { height: 1, backgroundColor: c.border, marginHorizontal: space[4] },

  segment: {
    flexDirection: 'row',
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.border,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: space[1] + 2,
    alignItems: 'center',
    borderRadius: radius.full,
  },
  segmentBtnActive: {
    backgroundColor: c.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  segmentText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  segmentTextActive: { color: c.text },

  sellBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#faf3e9', borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: '#f3e3cc',
    padding: space[4], marginBottom: space[4], marginHorizontal: space[4],
  },
  sellBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  sellBannerTitle: { fontSize: text.sm, fontWeight: weight.bold, color: '#5f3f18' },
  sellBannerSub: { fontSize: text.xs, color: '#9d6c35', marginTop: 2 },
  sellBannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f3e3cc', borderRadius: radius.full,
    paddingHorizontal: space[3], paddingVertical: space[2],
  },
  sellBannerBtnText: { fontSize: text.xs, fontWeight: weight.bold, color: '#9d6c35' },
});

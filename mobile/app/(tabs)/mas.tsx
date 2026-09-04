import { useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gavel, BookOpen, FileText, Receipt, CalendarClock,
  Inbox, Building2, Settings, ShieldCheck, ChevronRight,
  MapPin, CreditCard, BarChart3, ClipboardList, KeyRound, QrCode, type LucideIcon, LogOut, Newspaper } from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { usePlanStatus } from '../../hooks/use-plan';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { Avatar } from '../../components/Avatar';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, shadow, touch } from '../../styles/tokens';
import { Routes, nav } from '../../lib/routes';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
  iconColor?: string;
}

function MenuRow({ item, onPress, c, s }: { item: MenuItem; onPress: () => void; c: ThemeColors; s: Styles }) {
  const Icon = item.icon;
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={s.iconWrap}>
        <Icon size={22} color={c.text} strokeWidth={1.7} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel}>{item.label}</Text>
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
            <MenuRow item={item} onPress={() => { haptic.light(); onPress(item.path); }} c={c} s={s} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

export default function MasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: planStatus } = usePlanStatus();
  const hasReportes = planStatus?.features?.includes('reportes') ?? false;

  const role = user?.role ?? '';
  const isProp  = role === 'propietario';
  const isEstab = role === 'establecimiento';
  const isAdmin = role === 'admin';
  const isEncargado = role === 'encargado';

  const push = (path: string) => nav.push(router, path);

  const principal: MenuItem[] = [
    {
      icon: Newspaper,
      label: 'Muro',
      path: '/muro',
    },
    {
      icon: QrCode,
      label: 'Escanear QR',
      path: '/escanear',
    },
    ...(isEncargado ? [{
      icon: ClipboardList,
      label: 'Supervisión',
      path: Routes.supervision,
    }] : []),
    {
      icon: Gavel,
      label: 'Remates',
      path: Routes.remates,
    },
    {
      icon: BookOpen,
      label: 'Padrón de caballos',
      path: Routes.padron,
    },
    ...(!isProp ? [{
      icon: CalendarClock,
      label: 'Eventos',
      path: Routes.tabsEventos,
    }] : []),
    {
      icon: Receipt,
      label: 'Facturación',
      path: Routes.tabsFacturacion,
    },
  ];

  const gestion: MenuItem[] = [
    ...(isEstab || isProp ? [{
      icon: FileText,
      label: 'Contratos',
      path: Routes.contratos,
    }] : []),
    ...(isEstab || isAdmin ? [{
      icon: Inbox,
      label: 'Solicitudes de pensión',
      path: Routes.solicitudes,
    }] : []),
    ...(isProp ? [{
      icon: MapPin,
      label: 'Directorio',
      path: Routes.directorio,
    }] : []),
    ...(!isEstab ? [{
      icon: KeyRound,
      label: 'Unirme a una caballeriza',
      path: Routes.unirme,
    }] : []),
    ...(isEstab || isAdmin ? [{
      icon: Building2,
      label: 'Organización',
      path: Routes.organizacion,
    }] : []),
    ...(hasReportes ? [{
      icon: BarChart3,
      label: 'Reportes',
      path: Routes.reportes,
    }] : []),
  ];

  const cuenta: MenuItem[] = [
    {
      icon: CreditCard,
      label: 'Mi plan',
      path: Routes.miPlan,
    },
    ...(isAdmin ? [{
      icon: Settings,
      label: 'Configuración de notificaciones',
      path: Routes.notificacionesConfig,
      iconColor: colors.gray500,
    }] : []),
    ...(isAdmin ? [{
      icon: ShieldCheck,
      label: 'Superadmin',
      path: Routes.superadmin,
    }] : []),
  ];

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
        <Avatar name={user?.name} avatarColor={user?.avatar_color} size={50} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.profileName} numberOfLines={1}>{user?.name ?? 'Mi perfil'}</Text>
        </View>
        <ChevronRight size={20} color={c.textFaint} strokeWidth={2} />
      </TouchableOpacity>

      <Section title="Principal" items={principal} onPress={push} c={c} s={s} />
      <Section title="Gestión" items={gestion} onPress={push} c={c} s={s} />
      <Section title="Cuenta" items={cuenta} onPress={push} c={c} s={s} />
      <TouchableOpacity
        style={s.logoutRow}
        onPress={() => {
          haptic.medium();
          Alert.alert('Cerrar sesión', '¿Salir de tu cuenta?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Cerrar sesión', style: 'destructive', onPress: () => { void logout(); } },
          ]);
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <LogOut size={20} color={c.danger} strokeWidth={1.8} />
        <Text style={s.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2], minHeight: 52, marginTop: space[4],
  },
  logoutText: { fontSize: text.md, fontWeight: weight.medium, color: c.danger, letterSpacing: -0.2 },
  content: { paddingBottom: 120, gap: space[1] },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.xl,
    paddingVertical: space[3], paddingHorizontal: space[3] + 2,
    marginHorizontal: space[4], marginBottom: space[4],
    ...(c.isDark ? {} : shadow.sm),
  },
  profileName: { fontSize: text.base, fontWeight: weight.bold, color: c.text },

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
  sectionCard: {},

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    minHeight: 52,
    gap: space[3],
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },

  badge: {
    backgroundColor: c.danger,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: colors.white, fontSize: text.xs, fontWeight: weight.bold },

  divider: { height: 1, backgroundColor: c.border, marginHorizontal: space[4] },

  segmentBtnActive: {
    backgroundColor: c.surface,
    ...(c.isDark ? {} : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 }),
  },
});

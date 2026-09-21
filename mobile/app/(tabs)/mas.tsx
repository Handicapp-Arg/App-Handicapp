import { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, type StyleProp, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
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
import { PressableScale } from '../../components/PressableScale';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { useCommonStyles } from '../../styles/common';
import { entradaFila } from '../../styles/motion';
import { space, text, radius, weight, touch } from '../../styles/tokens';
import { Routes, nav } from '../../lib/routes';

/**
 * Etiqueta del rol para el subtítulo de la tarjeta de identidad. `RoleBadge` no
 * exporta su mapa, y acá no queremos el chip entero: solo el texto.
 */
const ROL_LABEL: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
  admin: 'Administrador',
  encargado: 'Encargado',
  jinete: 'Jinete',
  peon: 'Peón',
  haras: 'Haras',
};

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  badge?: number;
  /** Valor a la derecha, estilo Ajustes de iOS (ej: el plan en "Mi plan"). */
  value?: string;
}

function MenuRow({ item, onPress, ultima, c, s }: {
  item: MenuItem; onPress: () => void; ultima: boolean; c: ThemeColors; s: Styles;
}) {
  const Icon = item.icon;
  return (
    <PressableScale
      style={[s.row, !ultima && s.rowBorde]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={s.iconWrap}>
        <Icon size={21} color={c.text} strokeWidth={1.9} />
      </View>
      <Text style={s.rowLabel} numberOfLines={1}>{item.label}</Text>
      {item.badge != null && item.badge > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
        </View>
      )}
      {item.value ? <Text style={s.rowValue} numberOfLines={1}>{item.value}</Text> : null}
      <ChevronRight size={17} color={c.textFaint} strokeWidth={2.3} />
    </PressableScale>
  );
}

function Section({ title, items, onPress, desde, c, s, eyebrow }: {
  title: string; items: MenuItem[]; onPress: (path: string) => void;
  /** Índice global para que el escalonado siga corriendo entre secciones. */
  desde: number;
  c: ThemeColors; s: Styles; eyebrow: StyleProp<TextStyle>;
}) {
  if (items.length === 0) return null;
  return (
    <View style={s.section}>
      <Text style={[eyebrow, s.sectionTitle]}>{title}</Text>
      {items.map((item, idx) => (
        <Animated.View key={item.path} entering={entradaFila(desde + idx)}>
          <MenuRow
            item={item}
            ultima={idx === items.length - 1}
            onPress={() => { haptic.light(); onPress(item.path); }}
            c={c} s={s}
          />
        </Animated.View>
      ))}
    </View>
  );
}

export default function MasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { c } = useTheme();
  const { typography } = useCommonStyles();
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
      // El valor a la derecha sale del back (`/plans/status`), no lo inventamos.
      value: planStatus?.label,
    },
    ...(isAdmin ? [{
      icon: Settings,
      label: 'Configuración de notificaciones',
      path: Routes.notificacionesConfig,
    }] : []),
    ...(isAdmin ? [{
      icon: ShieldCheck,
      label: 'Superadmin',
      path: Routes.superadmin,
    }] : []),
  ];

  // Subtítulo de identidad: rol + plan, ambos reales. Si el plan todavía no
  // llegó mostramos solo el rol en vez de un guion suelto.
  const rolLabel = ROL_LABEL[role] ?? (role || 'Mi cuenta');
  const identidadSub = planStatus?.label
    ? `${rolLabel} · plan ${planStatus.label}`
    : rolLabel;

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + space[5] }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.pageTitle}>Más</Text>

      {/* Identidad sobre superficie invertida: la única pieza oscura de la
          pantalla. `c.text` como fondo y `c.bg` como tinta se dan vuelta solos
          en oscuro, así que no hace falta una variante por tema. */}
      <Animated.View entering={entradaFila(0)}>
        <PressableScale
          style={s.profileCard}
          onPress={() => { haptic.light(); push('/(tabs)/perfil'); }}
          accessibilityRole="button"
          accessibilityLabel="Ver mi perfil"
        >
          <Avatar name={user?.name} avatarColor={user?.avatar_color} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={s.profileName} numberOfLines={1}>{user?.name ?? 'Mi perfil'}</Text>
            <Text style={s.profileSub} numberOfLines={1}>{identidadSub}</Text>
          </View>
          <ChevronRight size={17} color={c.textMuted} strokeWidth={2.3} />
        </PressableScale>
      </Animated.View>

      <Section title="Principal" items={principal} onPress={push} desde={1} c={c} s={s} eyebrow={typography.sectionEyebrow} />
      <Section title="Gestión" items={gestion} onPress={push} desde={1 + principal.length} c={c} s={s} eyebrow={typography.sectionEyebrow} />
      <Section title="Cuenta" items={cuenta} onPress={push} desde={1 + principal.length + gestion.length} c={c} s={s} eyebrow={typography.sectionEyebrow} />

      {/* Cerrar sesión queda acá además de en Perfil: es el atajo que ya existía
          y sacarlo sería una regresión de camino, no un cambio de diseño. */}
      <PressableScale
        style={s.logoutRow}
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
        <View style={s.iconWrap}>
          <LogOut size={21} color={c.danger} strokeWidth={1.9} />
        </View>
        <Text style={s.logoutText}>Cerrar sesión</Text>
      </PressableScale>
    </ScrollView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 140 },

  pageTitle: {
    fontSize: text['2xl'], fontWeight: weight.bold, color: c.text,
    letterSpacing: -1.1, paddingHorizontal: space[4],
  },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: space[3] + 2,
    backgroundColor: c.text, borderRadius: radius.sheet,
    padding: space[4],
    marginHorizontal: space[4], marginTop: space[5],
  },
  profileName: { fontSize: text.md, fontWeight: weight.semibold, color: c.bg, letterSpacing: -0.2 },
  profileSub: { fontSize: text.sm, color: c.textMuted, marginTop: 2 },

  section: { marginTop: space[6], paddingHorizontal: space[4] },
  sectionTitle: { marginBottom: space[1] },

  row: {
    flexDirection: 'row', alignItems: 'center',
    minHeight: touch.field, gap: space[3] + 2,
  },
  rowBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  iconWrap: { width: 24, alignItems: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  rowValue: { fontSize: text.base, color: c.textFaint, maxWidth: 120 },

  badge: {
    backgroundColor: c.danger, borderRadius: radius.full,
    minWidth: 22, height: 22, paddingHorizontal: 7,
    justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: colors.white, fontSize: text.xs, fontWeight: weight.bold },

  logoutRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[4], minHeight: touch.field, gap: space[3] + 2,
    marginTop: space[5],
  },
  logoutText: { fontSize: text.md, fontWeight: weight.medium, color: c.danger, letterSpacing: -0.2 },
});

import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trophy, Calendar, GitBranch, BookOpen, FileText, Receipt, Bell, Search,
  Mail, Building2, Settings, ShieldCheck, ChevronRight, CircleUser, Megaphone,
  ArrowRight, Map, type LucideIcon,
} from 'lucide-react-native';
import { useAuth } from '../../lib/auth';
import { useNotifications } from '../../lib/notifications';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
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

function MenuRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const tint = item.iconColor ?? colors.brand;
  const Icon = item.icon;
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.iconWrap, { backgroundColor: `${tint}18` }]}>
        <Icon size={20} color={tint} strokeWidth={2} />
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
      <ChevronRight size={16} color={colors.gray300} strokeWidth={2} />
    </TouchableOpacity>
  );
}

function Section({ title, items, onPress }: { title: string; items: MenuItem[]; onPress: (path: string) => void }) {
  if (items.length === 0) return null;
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionCard}>
        {items.map((item, idx) => (
          <Animated.View key={item.path} entering={FadeInDown.duration(320).delay(Math.min(idx, 8) * 45)}>
            {idx > 0 && <View style={s.divider} />}
            <MenuRow item={item} onPress={() => { haptic.light(); onPress(item.path); }} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

export default function MasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unread } = useNotifications();

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
      icon: Calendar,
      label: 'Agenda',
      desc: 'Calendario de turnos y citas',
      path: Routes.tabsAgenda,
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
    {
      icon: Bell,
      label: 'Notificaciones',
      desc: 'Actividad reciente de tus caballos',
      path: Routes.notificaciones,
      badge: unread,
    },
    {
      icon: Search,
      label: 'Buscar',
      desc: 'Caballos, eventos y más',
      path: Routes.buscar,
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

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + space[4] }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado sección "Más" */}
      <View style={s.masHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.masGreeting}>{user?.name?.split(' ')[0] ?? 'Hola'}</Text>
          <Text style={s.masRoleLabel}>{roleLabel}</Text>
        </View>
        <TouchableOpacity
          style={s.masPerfilBtn}
          onPress={() => { haptic.light(); push('/(tabs)/perfil'); }}
          activeOpacity={0.8}
        >
          <CircleUser size={22} color={colors.brand} strokeWidth={2} />
          <Text style={s.masPerfilBtnText}>Mi perfil</Text>
        </TouchableOpacity>
      </View>

      {/* Banner vender caballo (propietarios) */}
      {isProp && (
        <TouchableOpacity
          style={s.sellBanner}
          onPress={() => { haptic.medium(); push(Routes.remateCrear); }}
          activeOpacity={0.85}
        >
          <View style={s.sellBannerLeft}>
            <Megaphone size={28} color="#9d6c35" strokeWidth={2} />
            <View>
              <Text style={s.sellBannerTitle}>¿Querés vender tu caballo?</Text>
              <Text style={s.sellBannerSub}>Publicalo en Remates en 2 minutos</Text>
            </View>
          </View>
          <View style={s.sellBannerBtn}>
            <Text style={s.sellBannerBtnText}>Publicar</Text>
            <ArrowRight size={14} color="#9d6c35" strokeWidth={2} />
          </View>
        </TouchableOpacity>
      )}

      <Section title="Principal" items={principal} onPress={push} />
      <Section title="Gestión" items={gestion} onPress={push} />
      <Section title="Cuenta" items={cuenta} onPress={push} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  content: { paddingBottom: space[10], gap: space[1] },

  masHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space[4], marginBottom: space[3],
  },
  masGreeting: { fontSize: text.lg, fontWeight: weight.bold, color: colors.gray900 },
  masRoleLabel: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  masPerfilBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.white, borderRadius: radius.full,
    paddingHorizontal: space[3], paddingVertical: space[2],
    borderWidth: 1, borderColor: colors.gray200,
  },
  masPerfilBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.brand },

  section: { marginBottom: space[4], paddingHorizontal: space[4] },
  sectionTitle: {
    fontSize: text.xs,
    fontWeight: weight.bold,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: space[2],
    paddingHorizontal: space[1],
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
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
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  rowDesc: { fontSize: text.xs, color: colors.gray400, marginTop: 1 },

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

  divider: { height: 1, backgroundColor: colors.gray50, marginHorizontal: space[4] },

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

import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { useNotifications } from '../../lib/notifications';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { Routes, nav } from '../../lib/routes';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: IoniconsName;
  label: string;
  desc: string;
  path: string;
  badge?: number;
  iconColor?: string;
}

function MenuRow({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.iconWrap, { backgroundColor: `${item.iconColor ?? colors.primary}18` }]}>
        <Ionicons name={item.icon} size={20} color={item.iconColor ?? colors.primary} />
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
      <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
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
          <View key={item.path}>
            {idx > 0 && <View style={s.divider} />}
            <MenuRow item={item} onPress={() => { haptic.light(); onPress(item.path); }} />
          </View>
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

  const push = (path: string) => nav.push(router, path);

  const principal: MenuItem[] = [
    {
      icon: 'git-branch-outline',
      label: 'Árbol Genealógico',
      desc: 'Pedigree global de caballos desde 1990',
      path: Routes.arbol,
      iconColor: '#059669',
    },
    {
      icon: 'book-outline',
      label: 'Padrón de caballos',
      desc: 'Registro oficial, pedigree y propietarios',
      path: Routes.padron,
      iconColor: '#7c3aed',
    },
    {
      icon: 'document-text-outline',
      label: 'Eventos',
      desc: 'Historial de carreras y actividades',
      path: Routes.tabsEventos,
      iconColor: '#0369a1',
    },
    {
      icon: 'calendar-outline',
      label: 'Agenda',
      desc: 'Calendario de turnos y citas',
      path: Routes.tabsAgenda,
      iconColor: '#0284c7',
    },
    {
      icon: 'receipt-outline',
      label: 'Facturación',
      desc: 'Facturas y pagos de pensión',
      path: Routes.tabsFacturacion,
      iconColor: '#8b5cf6',
    },
    {
      icon: 'notifications-outline',
      label: 'Notificaciones',
      desc: 'Actividad reciente de tus caballos',
      path: Routes.notificaciones,
      badge: unread,
      iconColor: '#ef4444',
    },
    {
      icon: 'search-outline',
      label: 'Buscar',
      desc: 'Caballos, eventos y más',
      path: Routes.buscar,
      iconColor: '#3b82f6',
    },
  ];

  const gestion: MenuItem[] = [
    ...(isEstab || isProp ? [{
      icon: 'document-text-outline' as IoniconsName,
      label: 'Contratos',
      desc: 'Contratos de pensión y acuerdos',
      path: Routes.contratos,
      iconColor: '#10b981',
    }] : []),
    ...(isEstab || isAdmin ? [{
      icon: 'mail-unread-outline' as IoniconsName,
      label: 'Solicitudes de pensión',
      desc: 'Aceptá o rechazá solicitudes entrantes',
      path: Routes.solicitudes,
      iconColor: '#f97316',
    }] : []),
    ...(isProp ? [{
      icon: 'map-outline' as IoniconsName,
      label: 'Directorio',
      desc: 'Encontrá establecimientos en HandicApp',
      path: Routes.directorio,
      iconColor: '#3b82f6',
    }] : []),
    ...(isEstab || isAdmin ? [{
      icon: 'business-outline' as IoniconsName,
      label: 'Organización',
      desc: 'Miembros, plan e invitaciones',
      path: Routes.organizacion,
      iconColor: '#8b5cf6',
    }] : []),
  ];

  const cuenta: MenuItem[] = [
    {
      icon: 'person-outline',
      label: 'Mi perfil',
      desc: 'Datos personales y plan',
      path: '/(tabs)/perfil',
      iconColor: colors.gray600,
    },
    ...(isAdmin ? [{
      icon: 'settings-outline' as IoniconsName,
      label: 'Config. notificaciones',
      desc: 'Qué tipos de eventos notifican a cada rol',
      path: Routes.notificacionesConfig,
      iconColor: colors.gray500,
    }] : []),
    ...(isAdmin ? [{
      icon: 'shield-checkmark-outline' as IoniconsName,
      label: 'Superadmin',
      desc: 'Métricas, planes y organizaciones',
      path: Routes.superadmin,
      iconColor: '#0f1f3d',
    }] : []),
  ];

  const ROLE_LABEL: Record<string, string> = {
    propietario: 'Propietario', establecimiento: 'Establecimiento',
    veterinario: 'Veterinario', admin: 'Administrador',
  };
  const ROLE_COLOR: Record<string, [string, string]> = {
    propietario:    ['#92400e', '#78350f'],
    establecimiento:['#065f46', '#064e3b'],
    veterinario:    ['#4c1d95', '#3b0764'],
    admin:          ['#1e3a8a', '#1e40af'],
  };
  const gradColors = ROLE_COLOR[role] ?? ['#1e3a8a', '#0f1f3d'];
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile card ── */}
      <LinearGradient
        colors={['#0a1628', '#0f1f3d', '#132548']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.profileCard, { paddingTop: insets.top + space[4] }]}
      >
        <View style={s.profileRow}>
          <View style={[s.profileAvatar, { backgroundColor: gradColors[0] }]}>
            <Text style={s.profileAvatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName} numberOfLines={1}>{user?.name ?? 'Usuario'}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{user?.email ?? ''}</Text>
            <View style={s.profileRolePill}>
              <Text style={s.profileRoleText}>{ROLE_LABEL[role] ?? role}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.profileEditBtn}
            onPress={() => { haptic.light(); push('/(tabs)/perfil'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={15} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Banner vender caballo (propietarios) */}
      {isProp && (
        <TouchableOpacity
          style={s.sellBanner}
          onPress={() => { haptic.medium(); push(Routes.remateCrear); }}
          activeOpacity={0.85}
        >
          <View style={s.sellBannerLeft}>
            <Ionicons name="megaphone-outline" size={28} color="#7c3aed" />
            <View>
              <Text style={s.sellBannerTitle}>¿Querés vender tu caballo?</Text>
              <Text style={s.sellBannerSub}>Publicalo en Remates en 2 minutos</Text>
            </View>
          </View>
          <View style={s.sellBannerBtn}>
            <Text style={s.sellBannerBtnText}>Publicar</Text>
            <Ionicons name="arrow-forward" size={14} color="#7c3aed" />
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

  profileCard: {
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    marginBottom: space[4],
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  profileAvatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
  },
  profileAvatarText: { fontSize: text.lg, fontWeight: weight.extrabold, color: colors.white },
  profileName: { fontSize: text.base, fontWeight: weight.bold, color: colors.white, letterSpacing: -0.2 },
  profileEmail: { fontSize: text.xs, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  profileRolePill: {
    alignSelf: 'flex-start', marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  profileRoleText: { fontSize: 10, fontWeight: weight.semibold, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  profileEditBtn: {
    width: 34, height: 34, borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

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
    backgroundColor: '#f5f3ff', borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: '#ddd6fe',
    padding: space[4], marginBottom: space[4],
  },
  sellBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  sellBannerTitle: { fontSize: text.sm, fontWeight: weight.bold, color: '#4c1d95' },
  sellBannerSub: { fontSize: text.xs, color: '#7c3aed', marginTop: 2 },
  sellBannerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ede9fe', borderRadius: radius.full,
    paddingHorizontal: space[3], paddingVertical: space[2],
  },
  sellBannerBtnText: { fontSize: text.xs, fontWeight: weight.bold, color: '#7c3aed' },
});

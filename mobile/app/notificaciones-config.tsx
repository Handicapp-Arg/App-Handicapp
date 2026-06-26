import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Receipt, FileText, AlertCircle, ChevronLeft, Lock, Stethoscope, Dumbbell,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { Routes } from '../lib/routes';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, shadow } from '../styles/tokens';
import { fontFamily } from '../styles/fonts';
import {
  useNotificationSettings, useUpdateNotificationSettings, useEventTypes,
  type EventTypeMeta,
} from '../hooks/use-notification-settings';

const ROLE_LABELS: Record<string, string> = {
  admin:         'Administrador',
  propietario:   'Propietario',
  establecimiento: 'Establecimiento',
  veterinario:   'Veterinario',
  staff:         'Staff',
  owner_role:    'Propietario en org',
  vet:           'Veterinario en org',
};

const EVENT_ICONS: Record<string, LucideIcon> = {
  salud:         Stethoscope,
  entrenamiento: Dumbbell,
  gasto:         Receipt,
  nota:          FileText,
};

/* ─── Tarjeta por rol ─── */
function RoleCard({
  role,
  enabledTypes,
  eventTypes,
  c,
  s,
}: {
  role: string;
  enabledTypes: string[];
  eventTypes: EventTypeMeta[];
  c: ThemeColors;
  s: Styles;
}) {
  const update = useUpdateNotificationSettings();
  const [state, setState] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const map: Record<string, boolean> = {};
    for (const et of eventTypes) map[et.value] = false;
    for (const v of enabledTypes) map[v] = true;
    setState(map);
    setDirty(false);
  }, [enabledTypes, eventTypes]);

  const toggle = (key: string) => {
    haptic.light();
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    haptic.medium();
    const types = eventTypes.map((et) => et.value).filter((v) => state[v]);
    await update.mutateAsync({ role, eventTypes: types });
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <View style={s.card}>
      {/* Header de la tarjeta */}
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>{ROLE_LABELS[role] ?? role}</Text>
          <Text style={s.cardDesc}>
            Notifica a usuarios con este rol cuando se cree un evento del tipo seleccionado.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => void handleSave()}
          disabled={!dirty || update.isPending}
          style={[s.saveBtn, (!dirty || update.isPending) && s.saveBtnDisabled]}
          activeOpacity={0.8}
        >
          {update.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={s.saveBtnText}>{saved ? '✓ Guardado' : 'Guardar'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Toggles */}
      <View style={s.toggleList}>
        {eventTypes.map((et, idx) => (
          <ToggleRowItem
            key={et.value}
            et={et}
            isLast={idx === eventTypes.length - 1}
            value={state[et.value] ?? false}
            onToggle={() => toggle(et.value)}
            c={c}
            s={s}
          />
        ))}
      </View>
    </View>
  );
}

/* ─── Fila de toggle (ícono Lucide/Ionicons + switch) ─── */
function ToggleRowItem({
  et, isLast, value, onToggle, c, s,
}: {
  et: EventTypeMeta;
  isLast: boolean;
  value: boolean;
  onToggle: () => void;
  c: ThemeColors;
  s: Styles;
}) {
  const Icon = EVENT_ICONS[et.value] ?? AlertCircle;
  return (
    <View style={[s.toggleRow, !isLast && s.toggleRowBorder]}>
      <View style={s.toggleLeft}>
        <Icon size={18} color={c.textMuted} strokeWidth={2} style={{ marginRight: space[2] }} />
        <Text style={s.toggleLabel}>{et.label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: c.borderStrong, true: c.brand }}
        thumbColor={colors.white}
        ios_backgroundColor={c.borderStrong}
      />
    </View>
  );
}

/* ─── Screen ─── */
export default function NotificacionesConfigScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: settings, isLoading: loadingSettings } = useNotificationSettings();
  const { data: eventTypes = [], isLoading: loadingTypes } = useEventTypes();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const isLoading = loadingSettings || loadingTypes;

  /* Roles que aparecen en la config */
  const roleNames = ['propietario', 'establecimiento', 'veterinario', 'admin', 'staff', 'owner_role', 'vet'];

  const settingsByRole: Record<string, string[]> = {};
  for (const role of roleNames) settingsByRole[role] = [];
  if (settings) {
    for (const setting of settings) {
      if (!settingsByRole[setting.role]) settingsByRole[setting.role] = [];
      settingsByRole[setting.role].push(setting.event_type);
    }
  }

  if (user?.role !== 'admin') {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.navigate(Routes.mas as never)} style={s.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={c.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Config. notificaciones</Text>
        </View>
        <View style={s.restricted}>
          <Lock size={32} color={c.textFaint} strokeWidth={2} />
          <Text style={s.restrictedText}>Solo el administrador puede acceder a esta pantalla.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.navigate(Routes.mas as never)} style={s.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={c.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: space[2] }}>
          <Text style={s.headerTitle}>Config. notificaciones</Text>
          <Text style={s.headerSub}>Por tipo de evento y rol</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={c.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          {roleNames.map((role) => (
            <RoleCard
              key={role}
              role={role}
              enabledTypes={settingsByRole[role] ?? []}
              eventTypes={eventTypes}
              c={c}
              s={s}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  backBtn: {
    width: 32, height: 32,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -space[1],
  },
  headerTitle: {
    fontSize: text.lg,
    fontWeight: weight.extrabold,
    fontFamily: fontFamily.extrabold,
    color: c.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: text.xs,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    marginTop: 1,
  },

  list: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[10],
  },

  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderStrong,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  cardTitle: {
    fontSize: text.sm,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: c.text,
  },
  cardDesc: {
    fontSize: text.xs,
    fontFamily: fontFamily.regular,
    color: c.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: c.brand,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: colors.white,
    fontSize: text.xs,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
  },

  toggleList: { paddingHorizontal: space[4] },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[3],
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: text.sm,
    fontFamily: fontFamily.medium,
    color: c.text,
  },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  restricted: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[8],
  },
  restrictedText: {
    fontSize: text.sm,
    fontFamily: fontFamily.regular,
    color: c.textFaint,
    textAlign: 'center',
    lineHeight: 20,
  },
});

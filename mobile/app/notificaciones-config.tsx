import { useState, useEffect } from 'react';
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
}: {
  role: string;
  enabledTypes: string[];
  eventTypes: EventTypeMeta[];
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
          />
        ))}
      </View>
    </View>
  );
}

/* ─── Fila de toggle (ícono Lucide/Ionicons + switch) ─── */
function ToggleRowItem({
  et, isLast, value, onToggle,
}: {
  et: EventTypeMeta;
  isLast: boolean;
  value: boolean;
  onToggle: () => void;
}) {
  const Icon = EVENT_ICONS[et.value] ?? AlertCircle;
  return (
    <View style={[s.toggleRow, !isLast && s.toggleRowBorder]}>
      <View style={s.toggleLeft}>
        <Icon size={18} color={colors.gray500} strokeWidth={2} style={{ marginRight: space[2] }} />
        <Text style={s.toggleLabel}>{et.label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray200, true: colors.brand }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.gray200}
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

  const isLoading = loadingSettings || loadingTypes;

  /* Roles que aparecen en la config */
  const roleNames = ['propietario', 'establecimiento', 'veterinario', 'admin', 'staff', 'owner_role', 'vet'];

  const settingsByRole: Record<string, string[]> = {};
  for (const role of roleNames) settingsByRole[role] = [];
  if (settings) {
    for (const s of settings) {
      if (!settingsByRole[s.role]) settingsByRole[s.role] = [];
      settingsByRole[s.role].push(s.event_type);
    }
  }

  if (user?.role !== 'admin') {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color={colors.gray900} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Config. notificaciones</Text>
        </View>
        <View style={s.restricted}>
          <Lock size={32} color={colors.gray300} strokeWidth={2} />
          <Text style={s.restrictedText}>Solo el administrador puede acceder a esta pantalla.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <ChevronLeft size={22} color={colors.gray900} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: space[2] }}>
          <Text style={s.headerTitle}>Config. notificaciones</Text>
          <Text style={s.headerSub}>Por tipo de evento y rol</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.brand} />
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
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
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
    color: colors.gray900,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: text.xs,
    fontFamily: fontFamily.regular,
    color: colors.gray400,
    marginTop: 1,
  },

  list: {
    padding: space[4],
    gap: space[4],
    paddingBottom: space[10],
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    backgroundColor: colors.gray50,
  },
  cardTitle: {
    fontSize: text.sm,
    fontWeight: weight.bold,
    fontFamily: fontFamily.bold,
    color: colors.gray900,
  },
  cardDesc: {
    fontSize: text.xs,
    fontFamily: fontFamily.regular,
    color: colors.gray500,
    marginTop: 2,
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: colors.brand,
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
    borderBottomColor: colors.gray50,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: text.sm,
    fontFamily: fontFamily.medium,
    color: colors.gray700,
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
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 20,
  },
});

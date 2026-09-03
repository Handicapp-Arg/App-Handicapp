import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Receipt, FileText, AlertCircle, Stethoscope, Dumbbell,
  type LucideIcon,
} from 'lucide-react-native';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, weight } from '../../styles/tokens';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  useNotificationSettings, useUpdateNotificationSettings, useEventTypes,
} from '../../hooks/use-notification-settings';

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

export default function RolNotificacionesScreen() {
  const rawRole = useLocalSearchParams<{ rol: string }>().rol;
  const role = Array.isArray(rawRole) ? rawRole[0] : rawRole;
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: settings, isLoading: loadingSettings } = useNotificationSettings();
  const { data: eventTypes = [], isLoading: loadingTypes } = useEventTypes();
  const update = useUpdateNotificationSettings();

  // Set de tipos activos para este rol, derivado del backend. Se guarda una
  // copia local para poder revertir de inmediato si la mutación falla, sin
  // esperar el refetch.
  const enabledFromServer = useMemo(
    () => new Set((settings ?? []).filter((st) => st.role === role).map((st) => st.event_type)),
    [settings, role],
  );
  const [enabled, setEnabled] = useState<Set<string>>(enabledFromServer);
  useEffect(() => {
    if (settings) setEnabled(enabledFromServer);
    // Solo cuando llega/cambia la respuesta del servidor: no queremos pisar
    // un toggle recién tocado por el usuario en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const isLoading = loadingSettings || loadingTypes;

  const toggle = async (eventType: string) => {
    if (!role) return;
    const wasEnabled = enabled.has(eventType);
    haptic.selection();

    // Autoguardado: cada toque dispara la mutación directamente, sin botón
    // Guardar ni estado "dirty" — el switch es la fuente de verdad.
    const next = new Set(enabled);
    if (wasEnabled) next.delete(eventType); else next.add(eventType);
    setEnabled(next);

    try {
      await update.mutateAsync({ role, eventTypes: [...next] });
    } catch {
      // Revierte el switch si el servidor rechazó el cambio.
      setEnabled(enabled);
      haptic.error();
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader showBack title={ROLE_LABELS[role ?? ''] ?? role ?? ''} subtitle="Tipos de evento que notifican" />

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={c.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          <Text style={s.hint}>
            Notifica a usuarios con este rol cuando se cree un evento del tipo seleccionado.
          </Text>
          {eventTypes.map((et, idx) => {
            const Icon = EVENT_ICONS[et.value] ?? AlertCircle;
            const isLast = idx === eventTypes.length - 1;
            return (
              <View key={et.value} style={[s.row, !isLast && s.rowBorder]}>
                <View style={s.rowLeft}>
                  <Icon size={18} color={c.textMuted} strokeWidth={2} />
                  <Text style={s.rowLabel}>{et.label}</Text>
                </View>
                <Switch
                  value={enabled.has(et.value)}
                  onValueChange={() => toggle(et.value)}
                  trackColor={{ false: c.borderStrong, true: c.brand }}
                  thumbColor={colors.white}
                  ios_backgroundColor={c.borderStrong}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: space[4], paddingBottom: space[10] },
  hint: { fontSize: text.sm, color: c.textMuted, lineHeight: 19, marginBottom: space[4] },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 52, paddingVertical: space[2],
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  rowLabel: { fontSize: text.md, fontWeight: weight.regular, color: c.text },
});

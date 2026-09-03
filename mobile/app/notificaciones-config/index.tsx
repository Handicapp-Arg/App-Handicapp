import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from '../../lib/secure-storage';
import * as Notifications from 'expo-notifications';
import api from '../../lib/api';
import { registerForPushNotifications } from '../../lib/push-notifications';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { Routes, nav } from '../../lib/routes';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch } from '../../styles/tokens';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useNotificationSettings, useEventTypes } from '../../hooks/use-notification-settings';

const ROLE_LABELS: Record<string, string> = {
  admin:         'Administrador',
  propietario:   'Propietario',
  establecimiento: 'Establecimiento',
  veterinario:   'Veterinario',
  staff:         'Staff',
  owner_role:    'Propietario en org',
  vet:           'Veterinario en org',
};

const ROLE_NAMES = ['propietario', 'establecimiento', 'veterinario', 'admin', 'staff', 'owner_role', 'vet'];

/* ─── Interruptor personal de push (visible para TODOS los usuarios) ───
 * Apagarlo borra el token en el servidor: se deja de recibir de verdad, no es
 * un mute local. Prenderlo vuelve a pedir permiso y re-registra. */
function PushMasterSwitch({ c, s }: { c: ThemeColors; s: Styles }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const pref = await SecureStore.getItemAsync('push_enabled');
      const perm = await Notifications.getPermissionsAsync();
      setEnabled(pref !== 'off' && perm.status === 'granted');
    })();
  }, []);

  const onToggle = async () => {
    if (busy || enabled === null) return;
    setBusy(true);
    haptic.selection();
    try {
      if (enabled) {
        await api.post('/auth/push-token', { token: null });
        await SecureStore.setItemAsync('push_enabled', 'off');
        setEnabled(false);
      } else {
        const token = await registerForPushNotifications();
        if (token) {
          await api.post('/auth/push-token', { token });
          await SecureStore.setItemAsync('push_enabled', 'on');
          setEnabled(true);
        } else {
          // Permiso denegado a nivel sistema: solo se revierte desde Ajustes.
          Linking.openSettings();
        }
      }
    } catch {
      haptic.error();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.masterRow}>
      <View style={s.masterLeft}>
        <View style={s.masterIcon}>
          <Bell size={19} color={c.brand} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.masterTitle}>Notificaciones push</Text>
          <Text style={s.masterDesc}>
            {enabled === false
              ? 'No vas a recibir avisos en este teléfono.'
              : 'Avisos de eventos, turnos y actividad en este teléfono.'}
          </Text>
        </View>
      </View>
      {enabled === null || busy ? (
        <ActivityIndicator size="small" color={c.brand} />
      ) : (
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ true: c.brand, false: c.borderStrong }}
          thumbColor={colors.white}
          accessibilityRole="switch"
          accessibilityLabel="Notificaciones push"
          accessibilityState={{ checked: enabled }}
        />
      )}
    </View>
  );
}

export default function NotificacionesConfigScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: settings, isLoading: loadingSettings } = useNotificationSettings();
  const { data: eventTypes = [], isLoading: loadingTypes } = useEventTypes();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const isAdmin = user?.role === 'admin';
  const isLoading = isAdmin && (loadingSettings || loadingTypes);

  const settingsByRole: Record<string, string[]> = {};
  for (const role of ROLE_NAMES) settingsByRole[role] = [];
  if (settings) {
    for (const setting of settings) {
      if (!settingsByRole[setting.role]) settingsByRole[setting.role] = [];
      settingsByRole[setting.role].push(setting.event_type);
    }
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader showBack title="Notificaciones" backTo={Routes.mas} />

      {isLoading ? (
        <View style={s.centered}>
          <ActivityIndicator color={c.brand} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          <PushMasterSwitch c={c} s={s} />

          {isAdmin && (
            <View style={s.rolesList}>
              <Text style={s.rolesTitle}>Por tipo de evento y rol</Text>
              {ROLE_NAMES.map((role) => {
                const activos = settingsByRole[role]?.length ?? 0;
                return (
                  <TouchableOpacity
                    key={role}
                    style={s.roleRow}
                    onPress={() => { haptic.selection(); nav.push(router, Routes.notificacionesConfigRol(role)); }}
                    activeOpacity={0.6}
                    accessibilityRole="button"
                    accessibilityLabel={ROLE_LABELS[role] ?? role}
                  >
                    <Text style={s.roleLabel}>{ROLE_LABELS[role] ?? role}</Text>
                    <Text style={s.roleValue}>{activos} de {eventTypes.length} activos</Text>
                    <ChevronRight size={16} color={c.textFaint} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: space[4], gap: space[6], paddingBottom: space[10] },

  masterRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 },
  masterIcon: {
    width: 40, height: 40, borderRadius: radius.full,
    backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  masterTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text, letterSpacing: -0.2 },
  masterDesc: { fontSize: text.sm, color: c.textMuted, marginTop: 2, lineHeight: 19 },

  rolesList: { gap: space[1] },
  rolesTitle: { fontSize: text.sm, fontWeight: weight.bold, color: c.textFaint, marginBottom: space[2], textTransform: 'uppercase', letterSpacing: 0.3 },
  roleRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    minHeight: touch.min + 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  roleLabel: { flex: 1, fontSize: text.md, fontWeight: weight.regular, color: c.text, letterSpacing: -0.2 },
  roleValue: { fontSize: text.sm, color: c.textFaint },
});

import { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useInvitationByToken, useAcceptInvitation, ROLE_LABELS } from '../../hooks/use-organizations';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch } from '../../styles/tokens';
import { Routes, nav } from '../../lib/routes';
import { AppImage } from '../../components/AppImage';

export default function InvitationScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  // El endpoint es público: mostramos la info aunque no haya sesión iniciada.
  const { data: invitation, isLoading, error } = useInvitationByToken(token);
  const accept = useAcceptInvitation();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  if (authLoading || isLoading) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    );
  }

  if (error || !invitation) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top, padding: space[5] }]}>
        <View style={s.errorIcon}>
          <AlertTriangle size={32} color={c.warning} strokeWidth={2} />
        </View>
        <Text style={s.errorTitle}>Invitación inválida</Text>
        <Text style={s.errorMsg}>El link que abriste no es válido, ya fue usado o expiró.</Text>
        <TouchableOpacity
          style={[s.btn, s.btnPrimary, { marginTop: 16 }]}
          onPress={() => { haptic.light(); nav.replace(router, Routes.tabsHome); }}
        >
          <Text style={s.btnPrimaryText}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Sin sesión: ofrecer crear cuenta (o iniciar sesión) para unirse ───
  if (!user) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.heroBlock}>
          <AppImage
            source={{ uri: 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png' }}
            style={s.logo}
            contentFit="contain"
          />
          <Text style={s.heroLabel}>Invitación</Text>
          <Text style={s.heroOrgName}>{invitation.organization.name}</Text>
        </View>

        <View style={s.body}>
          <Text style={s.copy}>
            <Text style={{ fontWeight: weight.bold }}>{invitation.inviter.name}</Text> te invita a unirte a{' '}
            <Text style={{ fontWeight: weight.bold }}>{invitation.organization.name}</Text> como{' '}
            <Text style={{ fontWeight: weight.bold, color: c.brand }}>{ROLE_LABELS[invitation.role_in_org]}</Text>.
          </Text>

          <View style={s.note}>
            <Text style={s.noteText}>
              Creá tu cuenta con el email {invitation.email} y vas a sumarte automáticamente a la organización con tu rol asignado.
            </Text>
          </View>

          <TouchableOpacity
            style={[s.btn, s.btnPrimary]}
            onPress={() => { haptic.light(); nav.push(router, `${Routes.authRegistro}?invitation=${encodeURIComponent(token)}`); }}
            activeOpacity={0.85}
          >
            <Text style={s.btnPrimaryText}>Crear cuenta y unirme</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.linkBtn}
            onPress={() => { haptic.light(); nav.replace(router, Routes.authLogin); }}
            accessibilityRole="button"
            accessibilityLabel="Ya tengo cuenta"
          >
            <Text style={s.linkBtnText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const emailMatch = invitation.email.toLowerCase() === user.email.toLowerCase();

  if (!emailMatch) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top, padding: space[5] }]}>
        <View style={s.errorIcon}>
          <AlertTriangle size={32} color={c.warning} strokeWidth={2} />
        </View>
        <Text style={s.errorTitle}>Email no coincide</Text>
        <Text style={s.errorMsg}>
          La invitación es para {invitation.email}, pero estás logueado como {user.email}.
          Cerrá sesión y entrá con la cuenta correcta.
        </Text>
      </View>
    );
  }

  const handleAccept = async () => {
    haptic.medium();
    await accept.mutateAsync(token);
    haptic.success();
    nav.replace(router, Routes.organizacion);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.heroBlock}>
        <AppImage
          source={{ uri: 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png' }}
          style={s.logo}
          contentFit="contain"
        />
        <Text style={s.heroLabel}>Invitación</Text>
        <Text style={s.heroOrgName}>{invitation.organization.name}</Text>
      </View>

      <View style={s.body}>
        <Text style={s.copy}>
          <Text style={{ fontWeight: weight.bold }}>{invitation.inviter.name}</Text> te invita a unirte a{' '}
          <Text style={{ fontWeight: weight.bold }}>{invitation.organization.name}</Text> como{' '}
          <Text style={{ fontWeight: weight.bold, color: c.brand }}>{ROLE_LABELS[invitation.role_in_org]}</Text>.
        </Text>

        <View style={s.note}>
          <Text style={s.noteText}>
            Al aceptar vas a poder colaborar con la organización dentro de HandicApp según tu rol asignado.
            Podés salir en cualquier momento.
          </Text>
        </View>

        <TouchableOpacity
          style={[s.btn, s.btnPrimary, accept.isPending && { opacity: 0.5 }]}
          onPress={handleAccept}
          disabled={accept.isPending}
          activeOpacity={0.85}
        >
          {accept.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Aceptar invitación</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.linkBtn}
          onPress={() => { haptic.light(); nav.replace(router, Routes.tabsHome); }}
          accessibilityRole="button"
          accessibilityLabel="No gracias"
        >
          <Text style={s.linkBtnText}>No gracias</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  // Hero fijo oscuro a propósito (no sigue el tema claro/oscuro): igual que ScreenHeader "dark".
  heroBlock: { backgroundColor: colors.primary, paddingHorizontal: space[5], paddingVertical: space[6], alignItems: 'center', gap: space[2] },
  logo: { width: 140, height: 32, marginBottom: 12 },
  heroLabel: { fontSize: text.xs, color: 'rgba(255,255,255,0.4)', fontWeight: weight.medium, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroOrgName: { fontSize: text.xl, fontWeight: weight.bold, color: colors.white, letterSpacing: -0.5 },
  body: { padding: space[5], gap: space[4] },
  copy: { fontSize: text.base, color: c.text, lineHeight: 23 },
  note: { backgroundColor: c.surfaceAlt, borderRadius: radius.lg, padding: space[3] },
  noteText: { fontSize: text.sm, color: c.textMuted, lineHeight: 19 },

  errorIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.warningSoft, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  errorTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  errorMsg: { fontSize: text.sm, color: c.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  btn: { borderRadius: radius.lg, height: touch.button, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.md, fontWeight: weight.bold, color: colors.white },
  // CTA secundario como link de texto: el primario tiene que quedar solo, sin competencia visual.
  linkBtn: { alignItems: 'center', justifyContent: 'center', minHeight: touch.min, paddingVertical: space[2] },
  linkBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted },
});

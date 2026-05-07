import { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image as RNImage,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useInvitationByToken, useAcceptInvitation, ROLE_LABELS } from '../../hooks/use-organizations';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { space, text, radius, weight } from '../../styles/tokens';

export default function InvitationScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: invitation, isLoading, error } = useInvitationByToken(user ? token : null);
  const accept = useAcceptInvitation();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login' as any);
    }
  }, [user, authLoading]);

  if (authLoading || !user || isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !invitation) {
    return (
      <View style={[s.root, s.center, { padding: space[5] }]}>
        <View style={s.errorIcon}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
        </View>
        <Text style={s.errorTitle}>Invitación inválida</Text>
        <Text style={s.errorMsg}>El link que abriste no es válido, ya fue usado o expiró.</Text>
        <TouchableOpacity style={[s.btn, s.btnPrimary, { marginTop: 16 }]} onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={s.btnPrimaryText}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emailMatch = invitation.email.toLowerCase() === user.email.toLowerCase();

  if (!emailMatch) {
    return (
      <View style={[s.root, s.center, { padding: space[5] }]}>
        <View style={s.errorIcon}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
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
    router.replace('/organizacion' as any);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.heroBlock}>
        <RNImage
          source={{ uri: 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png' }}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.heroLabel}>Invitación</Text>
        <Text style={s.heroOrgName}>{invitation.organization.name}</Text>
      </View>

      <View style={s.body}>
        <Text style={s.copy}>
          <Text style={{ fontWeight: weight.bold }}>{invitation.inviter.name}</Text> te invita a unirte a{' '}
          <Text style={{ fontWeight: weight.bold }}>{invitation.organization.name}</Text> como{' '}
          <Text style={{ fontWeight: weight.bold, color: '#c4922a' }}>{ROLE_LABELS[invitation.role_in_org]}</Text>.
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
          {accept.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryText}>Aceptar invitación</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={() => router.replace('/(tabs)' as any)}>
          <Text style={s.btnSecondaryText}>No gracias</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f3f8' },
  center: { justifyContent: 'center', alignItems: 'center' },
  heroBlock: { backgroundColor: '#0f1f3d', paddingHorizontal: space[5], paddingVertical: space[6], alignItems: 'center', gap: space[2] },
  logo: { width: 140, height: 32, marginBottom: 12 },
  heroLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: weight.medium, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroOrgName: { fontSize: text.xl, fontWeight: weight.bold, color: colors.white, letterSpacing: -0.5 },
  body: { padding: space[5], gap: space[4] },
  copy: { fontSize: text.sm, color: colors.gray700, lineHeight: 22 },
  note: { backgroundColor: colors.gray50, borderRadius: radius.lg, padding: space[3] },
  noteText: { fontSize: text.xs, color: colors.gray500, lineHeight: 18 },

  errorIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  errorTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  errorMsg: { fontSize: text.sm, color: colors.gray500, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  btn: { borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  btnSecondary: { borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white },
  btnSecondaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray600 },
});
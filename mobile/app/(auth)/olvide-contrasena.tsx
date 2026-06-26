import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight } from '../../styles/tokens';

const LOGO = 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png';

export default function OlvideContrasenaScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Ingresá tu email'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      setError('No se pudo procesar la solicitud. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Image source={{ uri: LOGO }} style={s.logo} resizeMode="contain" />
        <View style={s.successCard}>
          <View style={s.checkCircle}>
            <Text style={s.checkText}>✓</Text>
          </View>
          <Text style={s.successTitle}>Revisá tu email</Text>
          <Text style={s.successMsg}>
            Si existe una cuenta con {email}, vas a recibir un enlace para restablecer tu contraseña.
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={s.backBtnText}>← Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Image source={{ uri: LOGO }} style={s.logo} resizeMode="contain" />
      <View style={s.card}>
        <Text style={s.title}>Recuperar contraseña</Text>
        <Text style={s.subtitle}>
          Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
        </Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <View style={s.field}>
          <Text style={s.label}>Correo electrónico</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={c.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={s.btnText}>Enviar enlace</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={s.linkWrap}>
          <Text style={s.link}>← Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray900, justifyContent: 'center', padding: space[6] },
  logo: { width: 150, height: 64, alignSelf: 'center', marginBottom: space[5] },
  card: { backgroundColor: c.surface, borderRadius: radius['2xl'], padding: space[6], gap: space[4] },
  title: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text },
  subtitle: { fontSize: text.sm, color: c.textMuted, lineHeight: 20 },
  field: { gap: space[1] + 2 },
  label: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  input: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md,
    paddingHorizontal: space[4], paddingVertical: space[3],
    fontSize: text.sm, color: c.text, backgroundColor: c.surfaceAlt,
  },
  error: { fontSize: text.sm, color: colors.red700, backgroundColor: colors.red50, borderRadius: radius.md, padding: space[3] },
  btn: {
    backgroundColor: c.brand, borderRadius: radius.md,
    paddingVertical: space[3] + 2, alignItems: 'center',
  },
  btnText: { color: colors.white, fontSize: text.base, fontWeight: weight.bold },
  linkWrap: { alignItems: 'center' },
  link: { fontSize: text.sm, fontWeight: weight.semibold, color: c.brand },
  // success
  successCard: { backgroundColor: c.surface, borderRadius: radius['2xl'], padding: space[6], gap: space[4], alignItems: 'center' },
  checkCircle: {
    width: 64, height: 64, borderRadius: radius.full,
    backgroundColor: colors.emerald50, justifyContent: 'center', alignItems: 'center',
  },
  checkText: { fontSize: 28, color: colors.emerald700 },
  successTitle: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text },
  successMsg: { fontSize: text.sm, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
  backBtn: { marginTop: space[2] },
  backBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.brand },
});

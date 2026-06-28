import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, ArrowLeft } from 'lucide-react-native';
import api from '../../lib/api';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { HorseshoeH } from '../../components/icons/equine';
import { AuthBackground, AuthThemeSwitch } from '../../components/auth-ui';

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

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AuthBackground c={c} />
      <AuthThemeSwitch />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Marca — isotipo + wordmark (igual que el login) */}
        <View style={s.header}>
          <HorseshoeH size={64} color={c.brand} />
          <Text style={s.wordmark}>HandicApp</Text>
        </View>

        <View style={s.card}>
          {sent ? (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={s.checkCircle}>
                <Check size={28} color={c.isDark ? '#86efac' : '#15803d'} strokeWidth={2.5} />
              </View>
              <Text style={[s.title, { textAlign: 'center' }]}>Revisá tu email</Text>
              <Text style={[s.subtitle, { textAlign: 'center' }]}>
                Si existe una cuenta con {email}, vas a recibir un enlace para restablecer tu contraseña.
              </Text>
            </View>
          ) : (
            <>
              <Text style={s.title}>Recuperar contraseña</Text>
              <Text style={s.subtitle}>
                Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
              </Text>

              {error ? (
                <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>
              ) : null}

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
                  : <Text style={s.btnText}>Enviar enlace</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={s.linkWrap} activeOpacity={0.7}>
            <ArrowLeft size={15} color={c.brand} strokeWidth={2} />
            <Text style={s.link}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 26, gap: 10 },
  wordmark: { fontSize: 30, fontWeight: '700', letterSpacing: -0.3, color: c.text, marginTop: 2 },

  card: {
    backgroundColor: c.surface, borderRadius: 24, padding: 22, gap: 14,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 3,
  },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4, color: c.text },
  subtitle: { fontSize: 13, color: c.textMuted, lineHeight: 19 },

  checkCircle: {
    width: 60, height: 60, borderRadius: 999,
    backgroundColor: c.isDark ? 'rgba(34,197,94,0.16)' : '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
  },

  errorBox: { backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: c.isDark ? '#fca5a5' : colors.red700 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  input: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt,
  },
  btn: {
    backgroundColor: c.brand, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 2,
  },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  linkWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  link: { fontSize: 13, fontWeight: '700', color: c.brand },
});

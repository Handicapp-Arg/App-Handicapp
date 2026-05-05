import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../lib/api';
import { colors } from '../../lib/colors';
import { space, text, radius, weight } from '../../styles/tokens';

export default function OlvideContrasenaScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim()) { setError('Ingresá tu email'); return; }
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
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.successCard}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Revisá tu email</Text>
          <Text style={styles.successMsg}>
            Si existe una cuenta con {email}, vas a recibir un enlace para restablecer tu contraseña.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backBtnText}>← Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.field}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            placeholderTextColor={colors.gray400}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.btnText}>Enviar enlace</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkWrap}>
          <Text style={styles.link}>← Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', padding: space[6] },
  card: { backgroundColor: colors.white, borderRadius: radius['2xl'], padding: space[6], gap: space[4] },
  title: { fontSize: text.lg, fontWeight: weight.extrabold, color: colors.gray900 },
  subtitle: { fontSize: text.sm, color: colors.gray500, lineHeight: 20 },
  field: { gap: space[1] + 2 },
  label: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  input: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md,
    paddingHorizontal: space[4], paddingVertical: space[3],
    fontSize: text.sm, color: colors.gray900, backgroundColor: colors.gray50,
  },
  error: { fontSize: text.sm, color: colors.red700, backgroundColor: colors.red50, borderRadius: radius.md, padding: space[3] },
  btn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: space[3] + 2, alignItems: 'center',
  },
  btnText: { color: colors.white, fontSize: text.base, fontWeight: weight.bold },
  linkWrap: { alignItems: 'center' },
  link: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.primary },
  // success
  successCard: { backgroundColor: colors.white, borderRadius: radius['2xl'], padding: space[6], gap: space[4], alignItems: 'center' },
  checkCircle: {
    width: 64, height: 64, borderRadius: radius.full,
    backgroundColor: colors.emerald50, justifyContent: 'center', alignItems: 'center',
  },
  checkText: { fontSize: 28, color: colors.emerald700 },
  successTitle: { fontSize: text.lg, fontWeight: weight.extrabold, color: colors.gray900 },
  successMsg: { fontSize: text.sm, color: colors.gray500, textAlign: 'center', lineHeight: 20 },
  backBtn: { marginTop: space[2] },
  backBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.primary },
});

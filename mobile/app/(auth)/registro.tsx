import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { HorseshoeH } from '../../components/icons/equine';
import { AuthBackground, AuthThemeSwitch } from '../../components/auth-ui';
import api from '../../lib/api';

const ROLE_LABELS: Record<string, string> = {
  propietario: 'Propietario',
  establecimiento: 'Establecimiento',
  veterinario: 'Veterinario',
};

export default function RegistroScreen() {
  const { register } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('propietario');
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/roles').then(({ data }) => {
      const visible = data.filter((r: { name: string }) => r.name !== 'admin');
      setRoles(visible);
      if (visible.length > 0) setRole(visible[0].name);
    }).catch(() => {});
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password || !role) { setError('Completá todos los campos'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); return; }
    setError('');
    setLoading(true);
    try {
      await register(email.trim().toLowerCase(), password, name.trim(), role);
    } catch {
      setError('No se pudo crear la cuenta. El email puede estar en uso.');
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
          <Text style={s.title}>Creá tu cuenta</Text>
          <Text style={s.subtitle}>Empezá a gestionar tus caballos</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {[
            { label: 'Nombre', value: name, setter: setName, placeholder: 'Tu nombre completo', type: 'default' as const },
            { label: 'Correo electrónico', value: email, setter: setEmail, placeholder: 'tu@email.com', type: 'email-address' as const },
            { label: 'Contraseña', value: password, setter: setPassword, placeholder: 'Mínimo 6 caracteres', type: 'default' as const, secure: true },
          ].map((field) => (
            <View key={field.label} style={s.field}>
              <Text style={s.label}>{field.label}</Text>
              <TextInput
                style={s.input}
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor={c.textFaint}
                keyboardType={field.type}
                secureTextEntry={field.secure}
                autoCapitalize={field.type === 'email-address' ? 'none' : 'words'}
                autoComplete={field.type === 'email-address' ? 'email' : field.secure ? 'new-password' : 'name'}
              />
            </View>
          ))}

          <View style={s.field}>
            <Text style={s.label}>Tipo de cuenta</Text>
            <View style={s.roleGrid}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[s.roleBtn, role === r.name && s.roleBtnActive]}
                  onPress={() => setRole(r.name)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.roleBtnText, role === r.name && s.roleBtnTextActive]}>
                    {ROLE_LABELS[r.name] ?? r.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={s.btnText}>Crear cuenta</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>¿Ya tenés cuenta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={s.link}>Iniciá sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
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
  subtitle: { fontSize: 13, color: c.textMuted, marginTop: -8 },

  errorBox: { backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: c.isDark ? '#fca5a5' : colors.red700 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  input: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt,
  },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleBtn: {
    flex: 1, minWidth: '30%',
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center', backgroundColor: c.surface,
  },
  roleBtnActive: { backgroundColor: c.brand, borderColor: c.brand },
  roleBtnText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  roleBtnTextActive: { color: colors.white },
  btn: {
    backgroundColor: c.brand, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  footerText: { fontSize: 13, color: c.textMuted },
  link: { fontSize: 13, fontWeight: '700', color: c.brand },
});

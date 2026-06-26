import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import api from '../../lib/api';

const LOGO = 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png';

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
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <Image source={{ uri: LOGO }} style={s.logo} resizeMode="contain" />
        </View>

        <View style={s.card}>
          <Text style={s.title}>Crear cuenta</Text>

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
  root: { flex: 1, backgroundColor: colors.gray900 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 190, height: 80 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 28, fontWeight: '800', color: colors.white },
  brand: { fontSize: 26, fontWeight: '800', color: colors.white },
  card: { backgroundColor: c.surface, borderRadius: 24, padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', color: c.text },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: colors.red700 },
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

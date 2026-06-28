import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { AuthBackground, AuthThemeSwitch } from '../../components/auth-ui';
import { HorseshoeH } from '../../components/icons/equine';

const DEV_USERS = [
  { email: 'admin@handicapp.com',           password: 'handicapp2026', name: 'Alejo Admin',          role: 'Administrador' },
  { email: 'establecimiento@handicapp.com', password: 'handicapp2026', name: 'Haras Los Pinos',       role: 'Establecimiento' },
  { email: 'propietario@handicapp.com',     password: 'handicapp2026', name: 'Juan Propietario',      role: 'Propietario' },
  { email: 'propietario2@handicapp.com',    password: 'handicapp2026', name: 'Maria Propietaria',     role: 'Propietario' },
  { email: 'veterinario@handicapp.com',     password: 'handicapp2026', name: 'Dr. Pablo Veterinario', role: 'Veterinario' },
];

function DevUserPicker({ onSelect, c, s }: { onSelect: (email: string, password: string) => void; c: ThemeColors; s: Styles }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.devBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={s.devBtnText}>Acceso rápido · dev</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.picker}>
            {DEV_USERS.map((u) => (
              <TouchableOpacity
                key={u.email}
                style={s.pickerRow}
                activeOpacity={0.7}
                onPress={() => { onSelect(u.email, u.password); setOpen(false); }}
              >
                <Text style={s.pickerRole}>{u.role}</Text>
                <Text style={s.pickerEmail}>{u.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Completá todos los campos'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch {
      setError('Credenciales inválidas. Verificá tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <AuthBackground c={c} />
      <AuthThemeSwitch />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Marca — isotipo + wordmark */}
        <Animated.View style={s.header} entering={FadeIn.duration(600)}>
          <HorseshoeH size={64} color={c.brand} />
          <Text style={s.wordmark}>HandicApp</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={s.card} entering={FadeInDown.duration(500).delay(150)}>
          <Text style={s.cardTitle}>Iniciá sesión</Text>
          <Text style={s.cardSub}>Ingresá a tu cuenta para continuar</Text>

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
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

          <View style={s.field}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.inputFlex}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={c.textFaint}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                {showPassword
                  ? <EyeOff size={18} color={c.textFaint} />
                  : <Eye size={18} color={c.textFaint} />
                }
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Link href="/(auth)/olvide-contrasena" asChild>
              <TouchableOpacity>
                <Text style={s.linkMuted}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={s.btnText}>Ingresar</Text>
            }
          </TouchableOpacity>

          <View style={s.footer}>
            <Text style={s.footerText}>¿No tenés cuenta? </Text>
            <Link href="/(auth)/registro" asChild>
              <TouchableOpacity>
                <Text style={s.link}>Registrate</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {__DEV__ && <DevUserPicker onSelect={(e, p) => { setEmail(e); setPassword(p); }} c={c} s={s} />}
        </Animated.View>

        <Text style={s.tagline}>PLATAFORMA DE GESTIÓN ECUESTRE</Text>

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
  cardTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4, color: c.text },
  cardSub: { fontSize: 13, color: c.textFaint, marginTop: -8 },

  errorBox: {
    backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: c.isDark ? 'rgba(239,68,68,0.3)' : '#fecaca',
  },
  errorText: { fontSize: 13, color: c.isDark ? '#fca5a5' : '#b91c1c' },

  field: { gap: 6 },
  label: { fontSize: 12.5, fontWeight: '600', color: c.textMuted },
  input: {
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: c.text, backgroundColor: c.surfaceAlt,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12,
    backgroundColor: c.surfaceAlt,
  },
  inputFlex: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: c.text,
  },
  eyeBtn: { paddingHorizontal: 12 },

  devBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, marginTop: 2,
    borderRadius: 10, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.surfaceAlt,
  },
  devBtnText: { fontSize: 12.5, fontWeight: '600', color: c.textMuted },

  btn: {
    backgroundColor: c.brand, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 2,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 2 },
  footerText: { fontSize: 13, color: c.textFaint },
  link: { fontSize: 13, fontWeight: '700', color: c.brand },
  linkMuted: { fontSize: 12, color: c.textFaint },
  tagline: {
    textAlign: 'center', marginTop: 24, fontSize: 11,
    letterSpacing: 1.5, color: c.textFaint,
  },

  overlay: {
    flex: 1, backgroundColor: c.overlay,
    justifyContent: 'center', paddingHorizontal: 32,
  },
  picker: {
    backgroundColor: c.surface, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: c.border,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  pickerRole: { fontSize: 13.5, fontWeight: '600', color: c.text },
  pickerEmail: { fontSize: 11, color: c.textFaint },
});

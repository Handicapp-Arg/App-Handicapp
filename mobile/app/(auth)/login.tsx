import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

const LOGO = 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png';

const DEV_USERS = [
  { email: 'admin@handicapp.com',           password: 'handicapp2026', name: 'Alejo Admin',          role: 'Administrador' },
  { email: 'establecimiento@handicapp.com', password: 'handicapp2026', name: 'Haras Los Pinos',       role: 'Establecimiento' },
  { email: 'propietario@handicapp.com',     password: 'handicapp2026', name: 'Juan Propietario',      role: 'Propietario' },
  { email: 'propietario2@handicapp.com',    password: 'handicapp2026', name: 'Maria Propietaria',     role: 'Propietario' },
  { email: 'veterinario@handicapp.com',     password: 'handicapp2026', name: 'Dr. Pablo Veterinario', role: 'Veterinario' },
];

function DevUserPicker({ onSelect }: { onSelect: (email: string, password: string) => void }) {
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
      {/* Isotipo gigante como marca de agua */}
      <Image source={{ uri: LOGO }} style={s.watermark} resizeMode="contain" />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <Animated.View style={s.header} entering={FadeIn.duration(700)}>
          <Image source={{ uri: LOGO }} style={s.logo} resizeMode="contain" />
        </Animated.View>

        {/* Card glass */}
        <Animated.View style={s.card} entering={FadeInDown.duration(550).delay(180)}>
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
              placeholderTextColor="rgba(255,255,255,0.28)"
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
                placeholderTextColor="rgba(255,255,255,0.28)"
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                {showPassword
                  ? <EyeOff size={18} color="rgba(255,255,255,0.4)" />
                  : <Eye size={18} color="rgba(255,255,255,0.4)" />
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

          {__DEV__ && <DevUserPicker onSelect={(e, p) => { setEmail(e); setPassword(p); }} />}
        </Animated.View>

        <Text style={s.tagline}>PLATAFORMA DE GESTIÓN ECUESTRE</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray900 },
  watermark: {
    position: 'absolute', width: 360, height: 360,
    bottom: -90, right: -110, opacity: 0.04,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 26 },
  logo: { width: 210, height: 92 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 22, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.28)',
  },
  errorText: { fontSize: 13, color: '#fca5a5' },

  field: { gap: 6 },
  label: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  input: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.white, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  inputFlex: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.white,
  },
  eyeBtn: { paddingHorizontal: 12 },

  devBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, marginTop: 2,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  devBtnText: { fontSize: 12.5, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },

  btn: {
    backgroundColor: colors.brand, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 2,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 2 },
  footerText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  link: { fontSize: 13, fontWeight: '700', color: colors.brand300 },
  linkMuted: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  tagline: {
    textAlign: 'center', marginTop: 24, fontSize: 11,
    letterSpacing: 1.5, color: 'rgba(255,255,255,0.25)',
  },

  /* Modal picker — compacto y oscuro */
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', paddingHorizontal: 32,
  },
  picker: {
    backgroundColor: '#241b13', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  pickerRole: { fontSize: 13.5, fontWeight: '600', color: colors.white },
  pickerEmail: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
});

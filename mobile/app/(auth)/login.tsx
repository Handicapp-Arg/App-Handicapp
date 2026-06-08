import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';

const DEV_USERS = [
  { email: 'admin@handicapp.com',           password: 'handicapp2026', name: 'Alejo Admin',          role: 'Administrador' },
  { email: 'establecimiento@handicapp.com', password: 'handicapp2026', name: 'Haras Los Pinos',       role: 'Establecimiento' },
  { email: 'propietario@handicapp.com',     password: 'handicapp2026', name: 'Juan Propietario',      role: 'Propietario' },
  { email: 'propietario2@handicapp.com',    password: 'handicapp2026', name: 'Maria Propietaria',     role: 'Propietario' },
  { email: 'veterinario@handicapp.com',     password: 'handicapp2026', name: 'Dr. Pablo Veterinario', role: 'Veterinario' },
];

const ROLE_COLORS: Record<string, string> = {
  Administrador:  '#0f1f3d',
  Establecimiento:'#8b5cf6',
  Propietario:    '#10b981',
  Veterinario:    '#f59e0b',
};

function DevUserPicker({ onSelect }: { onSelect: (email: string, password: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity style={s.devBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Ionicons name="flash-outline" size={14} color={colors.primary} />
        <Text style={s.devBtnText}>Acceso rápido dev</Text>
        <Ionicons name="chevron-down" size={14} color={colors.primary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.picker}>
            <Text style={s.pickerTitle}>Usuarios de desarrollo</Text>
            {DEV_USERS.map((u) => (
              <TouchableOpacity
                key={u.email}
                style={s.pickerRow}
                activeOpacity={0.75}
                onPress={() => { onSelect(u.email, u.password); setOpen(false); }}
              >
                <View style={[s.roleTag, { backgroundColor: `${ROLE_COLORS[u.role]}18` }]}>
                  <Text style={[s.roleTagText, { color: ROLE_COLORS[u.role] }]}>{u.role}</Text>
                </View>
                <View style={s.pickerInfo}>
                  <Text style={s.pickerName}>{u.name}</Text>
                  <Text style={s.pickerEmail}>{u.email}</Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color={colors.gray300} />
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
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo / cabecera */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>H</Text>
          </View>
          <Text style={s.brand}>HandicApp</Text>
          <Text style={s.subtitle}>Gestión equina profesional</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.title}>Iniciar sesión</Text>

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
              placeholderTextColor={colors.gray400}
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
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn}>
                {showPassword
                  ? <EyeOff size={18} color={colors.gray400} />
                  : <Eye size={18} color={colors.gray400} />
                }
              </TouchableOpacity>
            </View>
          </View>

          {__DEV__ && <DevUserPicker onSelect={(e, p) => { setEmail(e); setPassword(p); }} />}

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

          <Link href="/(auth)/olvide-contrasena" asChild>
            <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: -4 }}>
              <Text style={[s.link, { fontSize: 12 }]}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </Link>

          <View style={s.footer}>
            <Text style={s.footerText}>¿No tenés cuenta? </Text>
            <Link href="/(auth)/registro" asChild>
              <TouchableOpacity>
                <Text style={s.link}>Registrate</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 28, fontWeight: '800', color: colors.white },
  brand: { fontSize: 26, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.gray900 },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: colors.red700 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  input: {
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.gray200, borderRadius: 12,
    backgroundColor: colors.gray50,
  },
  inputFlex: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: colors.gray900,
  },
  eyeBtn: { paddingHorizontal: 12 },

  devBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1,
    borderColor: `${colors.primary}30`,
    backgroundColor: `${colors.primary}08`,
  },
  devBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  btn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 15, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  footerText: { fontSize: 13, color: colors.gray500 },
  link: { fontSize: 13, fontWeight: '700', color: colors.primary },

  /* Modal picker */
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', paddingHorizontal: 24,
  },
  picker: {
    backgroundColor: colors.white, borderRadius: 20,
    paddingVertical: 8, overflow: 'hidden',
  },
  pickerTitle: {
    fontSize: 13, fontWeight: '700', color: colors.gray400,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.gray50,
  },
  roleTag: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, minWidth: 90, alignItems: 'center',
  },
  roleTagText: { fontSize: 11, fontWeight: '700' },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  pickerEmail: { fontSize: 11, color: colors.gray400, marginTop: 1 },
});

import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { HorseshoeH } from '../../components/icons/equine';
import { AuthBackground, AuthThemeSwitch } from '../../components/auth-ui';
import api from '../../lib/api';

const ROLE_INFO: Record<string, { label: string; desc: string }> = {
  propietario:     { label: 'Propietario',     desc: 'Seguí el historial, eventos y documentos de tus caballos.' },
  establecimiento: { label: 'Establecimiento', desc: 'Gestioná caballos, eventos, contratos y tu equipo.' },
  veterinario:     { label: 'Veterinario',     desc: 'Atendé a tus pacientes con su historial clínico.' },
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
  const [roleModal, setRoleModal] = useState(false);
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
            <TouchableOpacity style={s.selectField} onPress={() => setRoleModal(true)} activeOpacity={0.8}>
              <Text style={s.selectValue}>{ROLE_INFO[role]?.label ?? 'Elegí una opción'}</Text>
              <ChevronDown size={18} color={c.textFaint} strokeWidth={2} />
            </TouchableOpacity>
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

      <Modal visible={roleModal} transparent animationType="fade" onRequestClose={() => setRoleModal(false)}>
        <TouchableOpacity style={s.roleOverlay} activeOpacity={1} onPress={() => setRoleModal(false)}>
          <View style={s.roleSheet}>
            <View style={s.roleGrabber} />
            <Text style={s.roleSheetTitle}>Tipo de cuenta</Text>
            {roles.map((r) => {
              const info = ROLE_INFO[r.name];
              const active = role === r.name;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[s.roleOption, active && s.roleOptionActive]}
                  onPress={() => { setRole(r.name); setRoleModal(false); }}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.roleOptionLabel}>{info?.label ?? r.name}</Text>
                    {info?.desc ? <Text style={s.roleOptionDesc}>{info.desc}</Text> : null}
                  </View>
                  {active && <Check size={18} color={c.brand} strokeWidth={2.5} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
  selectField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: c.borderStrong, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: c.surfaceAlt,
  },
  selectValue: { fontSize: 14, fontWeight: '600', color: c.text },
  roleOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  roleSheet: {
    backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 16, paddingBottom: 30, gap: 8, borderTopWidth: 1, borderColor: c.border,
  },
  roleGrabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, alignSelf: 'center', marginBottom: 6 },
  roleSheetTitle: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 4, paddingHorizontal: 4 },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  roleOptionActive: { borderColor: c.brand, backgroundColor: c.brandSoft },
  roleOptionLabel: { fontSize: 15, fontWeight: '700', color: c.text },
  roleOptionDesc: { fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
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

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ChevronDown, Check } from 'lucide-react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { haptic } from '../../lib/haptics';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { HorseshoeH } from '../../components/icons/equine';
import { AuthBackground } from '../../components/auth-ui';
import { BottomSheet } from '../../components/BottomSheet';
import { useInvitationByToken, ROLE_LABELS } from '../../hooks/use-organizations';
import { fontFamily } from '../../styles/fonts';
import api from '../../lib/api';

const ROLE_INFO: Record<string, { label: string; desc: string }> = {
  propietario:     { label: 'Propietario',     desc: 'Seguí el historial, eventos y documentos de tus caballos.' },
  establecimiento: { label: 'Establecimiento', desc: 'Gestioná caballos, eventos, contratos y tu equipo.' },
  veterinario:     { label: 'Veterinario',     desc: 'Atendé a tus pacientes con su historial clínico.' },
};

export default function RegistroScreen() {
  const { register } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const { invitation: invitationToken } = useLocalSearchParams<{ invitation?: string }>();
  // Con invitación el rol lo define el link; ocultamos el selector.
  const { data: invitation } = useInvitationByToken(invitationToken || null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('propietario');
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [roleModal, setRoleModal] = useState(false);
  const [focused, setFocused] = useState<'name' | 'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (invitationToken) return;
    api.get('/roles').then(({ data }) => {
      const visible = data.filter((r: { name: string }) => r.name !== 'admin');
      setRoles(visible);
      if (visible.length > 0) setRole(visible[0].name);
    }).catch(() => {});
  }, [invitationToken]);

  // Prefijar el email de la invitación (debe coincidir en el backend).
  useEffect(() => {
    if (invitation?.email) setEmail(invitation.email);
  }, [invitation?.email]);

  const emailBloqueado = Boolean(invitation);

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!name || !email || !password || !role) { setError('Completá todos los campos'); haptic.error(); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); haptic.error(); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); haptic.error(); return; }
    setError('');
    setLoading(true);
    haptic.light();
    try {
      // Con invitación el backend deriva el rol de la invitación; role va como fallback.
      await register(email.trim().toLowerCase(), password, name.trim(), role, invitationToken || undefined);
      haptic.success();
    } catch {
      setError('No se pudo crear la cuenta. El email puede estar en uso o no coincidir con la invitación.');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <AuthBackground c={c} />
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Marca */}
          <Animated.View style={s.header} entering={FadeIn.duration(500)}>
            <HorseshoeH size={52} color={c.brand} />
          </Animated.View>

          {/* Título */}
          <Animated.View style={s.intro} entering={FadeInDown.duration(450).delay(80)}>
            <Text style={s.title}>Creá tu cuenta</Text>
            <Text style={s.subtitle}>
              {invitation ? 'Registrate para unirte a la organización' : 'Empezá a gestionar tus caballos'}
            </Text>
          </Animated.View>

          {/* Formulario */}
          <Animated.View style={s.form} entering={FadeInDown.duration(450).delay(160)}>
            {invitation ? (
              <View style={s.inviteBox}>
                <Text style={s.inviteText}>
                  Te unís a <Text style={s.inviteStrong}>{invitation.organization.name}</Text> como{' '}
                  <Text style={s.inviteRole}>{ROLE_LABELS[invitation.role_in_org]}</Text>.
                </Text>
              </View>
            ) : null}

            {error ? (
              <Animated.View style={s.errorBox} entering={FadeIn.duration(200)}>
                <Text style={s.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <View style={[s.inputWrap, focused === 'name' && s.inputWrapFocused]}>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Nombre completo"
                placeholderTextColor={c.textFaint}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => (emailBloqueado ? passwordRef : emailRef).current?.focus()}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                submitBehavior="submit"
              />
            </View>

            <View style={[
              s.inputWrap,
              focused === 'email' && s.inputWrapFocused,
              emailBloqueado && s.inputWrapDisabled,
            ]}>
              <TextInput
                ref={emailRef}
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Correo electrónico"
                placeholderTextColor={c.textFaint}
                editable={!emailBloqueado}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                submitBehavior="submit"
              />
            </View>

            <View style={[s.inputWrap, focused === 'password' && s.inputWrapFocused]}>
              <TextInput
                ref={passwordRef}
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña (mínimo 6 caracteres)"
                placeholderTextColor={c.textFaint}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                autoComplete="new-password"
                returnKeyType="go"
                onSubmitEditing={handleRegister}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
            </View>

            {!invitationToken && (
              <Pressable
                style={({ pressed }) => [s.inputWrap, s.selectField, pressed && s.selectPressed]}
                onPress={() => { haptic.selection(); Keyboard.dismiss(); setRoleModal(true); }}
              >
                <View style={s.selectTexts}>
                  <Text style={s.selectHint}>Tipo de cuenta</Text>
                  <Text style={s.selectValue}>{ROLE_INFO[role]?.label ?? 'Elegí una opción'}</Text>
                </View>
                <ChevronDown size={19} color={c.textFaint} strokeWidth={2} />
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.btnText}>{invitation ? 'Crear cuenta y unirme' : 'Crear cuenta'}</Text>
              }
            </Pressable>
          </Animated.View>

          {/* Login */}
          <Animated.View style={s.footer} entering={FadeIn.duration(400).delay(280)}>
            <Text style={s.footerText}>¿Ya tenés cuenta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity hitSlop={6}>
                <Text style={s.link}>Iniciá sesión</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={roleModal} onClose={() => setRoleModal(false)} title="Tipo de cuenta">
        {roles.map((r) => {
          const info = ROLE_INFO[r.name];
          const active = role === r.name;
          return (
            <TouchableOpacity
              key={r.id}
              style={[s.roleOption, active && s.roleOptionActive]}
              onPress={() => { haptic.selection(); setRole(r.name); setRoleModal(false); }}
              activeOpacity={0.85}
            >
              <View style={s.flex}>
                <Text style={s.roleOptionLabel}>{info?.label ?? r.name}</Text>
                {info?.desc ? <Text style={s.roleOptionDesc}>{info.desc}</Text> : null}
              </View>
              {active && <Check size={19} color={c.brand} strokeWidth={2.5} />}
            </TouchableOpacity>
          );
        })}
      </BottomSheet>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26 },

  header: { alignItems: 'center', marginBottom: 24 },

  intro: { marginBottom: 24 },
  title: {
    fontSize: 32, fontWeight: '700', fontFamily: fontFamily.semibold,
    letterSpacing: -0.8, color: c.text,
  },
  subtitle: { fontSize: 15, color: c.textMuted, marginTop: 6, letterSpacing: -0.1 },

  form: { gap: 12 },

  inviteBox: {
    backgroundColor: c.brandSoft, borderRadius: 12, padding: 13,
  },
  inviteText: { fontSize: 13.5, color: c.textMuted, lineHeight: 19 },
  inviteStrong: { fontWeight: '700', color: c.text },
  inviteRole: { fontWeight: '700', color: c.brand },

  errorBox: {
    backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', borderRadius: 12, padding: 13,
    borderWidth: 1, borderColor: c.isDark ? 'rgba(239,68,68,0.3)' : '#fecaca',
  },
  errorText: { fontSize: 13.5, color: c.isDark ? '#fca5a5' : '#b91c1c' },

  inputWrap: {
    height: 56, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: c.brand, backgroundColor: c.surface },
  inputWrapDisabled: { opacity: 0.6 },
  input: {
    height: '100%', paddingHorizontal: 16,
    fontSize: 16.5, color: c.text, letterSpacing: -0.2,
  },

  selectField: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  selectPressed: { opacity: 0.85 },
  selectTexts: { flex: 1 },
  selectHint: { fontSize: 11.5, color: c.textFaint, marginBottom: 1 },
  selectValue: { fontSize: 15.5, fontWeight: '600', color: c.text, letterSpacing: -0.2 },

  btn: {
    backgroundColor: c.brand, borderRadius: 14, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { fontSize: 14.5, color: c.textMuted },
  link: { fontSize: 14.5, fontWeight: '700', color: c.brand },

  roleOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15,
    borderRadius: 14, backgroundColor: c.surfaceAlt,
  },
  roleOptionActive: { backgroundColor: c.brandSoft },
  roleOptionLabel: { fontSize: 15.5, fontWeight: '700', color: c.text, letterSpacing: -0.2 },
  roleOptionDesc: { fontSize: 12.5, color: c.textMuted, marginTop: 2, lineHeight: 17 },
});

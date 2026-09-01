import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn, FadeInDown, useSharedValue, useAnimatedStyle,
  withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { haptic } from '../../lib/haptics';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { AuthBackground } from '../../components/auth-ui';
import { BottomSheet } from '../../components/BottomSheet';
import { HorseshoeH } from '../../components/icons/equine';
import { fontFamily } from '../../styles/fonts';

const DEV_USERS = [
  { email: 'admin@handicapp.com',           password: 'handicapp2026', name: 'Alejo Admin',          role: 'Administrador' },
  { email: 'establecimiento@handicapp.com', password: 'handicapp2026', name: 'Haras Los Pinos',       role: 'Establecimiento' },
  { email: 'propietario@handicapp.com',     password: 'handicapp2026', name: 'Juan Propietario',      role: 'Propietario' },
  { email: 'propietario2@handicapp.com',    password: 'handicapp2026', name: 'Maria Propietaria',     role: 'Propietario' },
  { email: 'veterinario@handicapp.com',     password: 'handicapp2026', name: 'Dr. Pablo Veterinario', role: 'Veterinario' },
  { email: 'encargado@handicapp.com',       password: 'handicapp2026', name: 'Carlos Encargado',      role: 'Encargado' },
  { email: 'jinete@handicapp.com',          password: 'handicapp2026', name: 'Diego Jinete',          role: 'Jinete' },
  { email: 'peon@handicapp.com',            password: 'handicapp2026', name: 'Ramón Peón',            role: 'Peón' },
];

function DevUserPicker({ onSelect, s }: { onSelect: (email: string, password: string) => void; s: Styles }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={s.devBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={s.devBtnText}>Acceso rápido · dev</Text>
      </TouchableOpacity>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title="Acceso rápido · dev">
        <View style={s.picker}>
          {DEV_USERS.map((u, i) => (
            <TouchableOpacity
              key={u.email}
              style={[s.pickerRow, i === 0 && s.pickerRowFirst]}
              activeOpacity={0.7}
              onPress={() => { onSelect(u.email, u.password); setOpen(false); }}
            >
              <Text style={s.pickerRole}>{u.role}</Text>
              <Text style={s.pickerEmail}>{u.email}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}


/** Overlay de ingreso: el isotipo late y gira suave mientras la sesión abre. */
function LoginOverlay({ c }: { c: ThemeColors }) {
  const scale = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 620, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    spin.value = withRepeat(withTiming(360, { duration: 2600, easing: Easing.linear }), -1);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${spin.value}deg` }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 }]}
      entering={FadeIn.duration(220)}
    >
      <Animated.View style={logoStyle}>
        <HorseshoeH size={64} color={c.brand} />
      </Animated.View>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) { setError('Completá todos los campos'); haptic.error(); return; }
    setError('');
    setLoading(true);
    haptic.light();
    try {
      await login(email.trim().toLowerCase(), password);
      haptic.success();
    } catch {
      setError('Credenciales inválidas. Verificá tu email y contraseña.');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <AuthBackground c={c} />
      {loading && <LoginOverlay c={c} />}
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 },
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
            <Text style={s.title}>Bienvenido</Text>
            <Text style={s.subtitle}>Ingresá a tu cuenta para continuar</Text>
          </Animated.View>

          {/* Formulario */}
          <Animated.View style={s.form} entering={FadeInDown.duration(450).delay(160)}>
            {error ? (
              <Animated.View style={s.errorBox} entering={FadeIn.duration(200)}>
                <Text style={s.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <View style={[s.inputWrap, focused === 'email' && s.inputWrapFocused]}>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Correo electrónico"
                placeholderTextColor={c.textFaint}
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

            <View style={[s.inputWrap, s.inputRow, focused === 'password' && s.inputWrapFocused]}>
              <TextInput
                ref={passwordRef}
                style={[s.input, s.inputFlex]}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor={c.textFaint}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <Pressable
                onPress={() => { haptic.selection(); setShowPassword(v => !v); }}
                style={s.eyeBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword
                  ? <EyeOff size={19} color={c.textFaint} />
                  : <Eye size={19} color={c.textFaint} />
                }
              </Pressable>
            </View>

            <Link href="/(auth)/olvide-contrasena" asChild>
              <TouchableOpacity style={s.forgotBtn} hitSlop={6}>
                <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </Link>

            <Pressable
              style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.btnText}>Ingresar</Text>
              }
            </Pressable>

            {__DEV__ && <DevUserPicker onSelect={(e, p) => { setEmail(e); setPassword(p); }} s={s} />}
          </Animated.View>

          {/* Registro */}
          <Animated.View style={s.footer} entering={FadeIn.duration(400).delay(280)}>
            <Text style={s.footerText}>¿No tenés cuenta? </Text>
            <Link href="/(auth)/registro" asChild>
              <TouchableOpacity hitSlop={6}>
                <Text style={s.link}>Registrate</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26 },

  header: { alignItems: 'center', marginBottom: 28 },

  intro: { marginBottom: 26 },
  title: {
    fontSize: 32, fontWeight: '700', fontFamily: fontFamily.semibold,
    letterSpacing: -0.8, color: c.text,
  },
  subtitle: { fontSize: 15, color: c.textMuted, marginTop: 6, letterSpacing: -0.1 },

  form: { gap: 12 },

  errorBox: {
    backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', borderRadius: 12, padding: 13,
    borderWidth: 1, borderColor: c.isDark ? 'rgba(239,68,68,0.3)' : '#fecaca',
  },
  errorText: { fontSize: 13.5, color: c.isDark ? '#fca5a5' : '#b91c1c' },

  inputWrap: {
    height: 56, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: c.isDark ? c.surfaceAlt : '#f1f2f4',
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: c.brand, backgroundColor: c.surface },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    height: '100%', paddingHorizontal: 16,
    fontSize: 16.5, color: c.text, letterSpacing: -0.2,
  },
  inputFlex: { flex: 1 },
  eyeBtn: { paddingHorizontal: 16, height: '100%', justifyContent: 'center' },

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 13.5, color: c.textMuted, fontWeight: '500' },

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

  devBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, marginTop: 4,
    borderRadius: 12, backgroundColor: c.surfaceAlt,
  },
  devBtnText: { fontSize: 12.5, fontWeight: '600', color: c.textMuted },

  picker: {
    backgroundColor: c.surfaceAlt, borderRadius: 16, overflow: 'hidden',
    marginBottom: 8,
    ...(c.isDark ? {} : {
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    }),
  },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  pickerRowFirst: { borderTopWidth: 0 },
  pickerRole: { fontSize: 13.5, fontWeight: '600', color: c.text },
  pickerEmail: { fontSize: 11, color: c.textFaint },
});

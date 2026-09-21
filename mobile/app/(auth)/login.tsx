import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Eye, EyeOff } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { haptic } from '../../lib/haptics';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { AUTH_DARK as D, AuthDarkBackground } from '../../components/auth-dark';
import { mostrarCortina, ocultarCortina } from '../../components/IngresoCurtain';
import { loginBiometrico, guardarCredencialesBiometricas, hayCredencialesGuardadas, biometriaDisponible } from '../../lib/biometria';
import { ScanFace } from 'lucide-react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { PressableScale } from '../../components/PressableScale';
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
  const [bioListo, setBioListo] = useState(false);

  const entrarConBiometria = async () => {
    const creds = await loginBiometrico();
    if (!creds) return;
    setLoading(true);
    mostrarCortina();
    try {
      await login(creds.email, creds.password);
      haptic.success();
      setTimeout(() => ocultarCortina(), 250);
    } catch {
      ocultarCortina();
      setError('No pudimos ingresar con Face ID. Probá con tu contraseña.');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  // Al llegar al login: si hay credenciales guardadas, Face ID sale solo.
  useEffect(() => {
    (async () => {
      if ((await biometriaDisponible()) && (await hayCredencialesGuardadas())) {
        setBioListo(true);
        void entrarConBiometria();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email || !password) { setError('Completá todos los campos'); haptic.error(); return; }
    setError('');
    setLoading(true);
    haptic.light();
    mostrarCortina();
    try {
      await login(email.trim().toLowerCase(), password);
      void guardarCredencialesBiometricas(email.trim().toLowerCase(), password);
      haptic.success();
      // La navegación al Home ya ocurrió por debajo: revelarla con calma.
      setTimeout(() => ocultarCortina(), 250);
    } catch {
      ocultarCortina();
      setError('Credenciales inválidas. Verificá tu email y contraseña.');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <AuthDarkBackground />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/*
            Bloque de arriba: marca + promesa. Ocupa todo el aire sobrante
            (flexGrow) y se centra en él, así el formulario queda anclado abajo,
            cerca del pulgar, como en la maqueta. El logo va arriba a la
            izquierda, alineado con el título: es un encabezado, no un sello.
            Una sola entrada sobria para toda la pantalla; el stack ya la desliza.
          */}
          <Animated.View style={s.hero} entering={FadeIn.duration(420)}>
            <HorseshoeH size={76} color={D.text} />
            <Text style={s.title}>Todo lo de tus{'\n'}caballos, acá</Text>
            <Text style={s.subtitle}>Sanidad, gastos y trabajo del día, en un solo lugar.</Text>
          </Animated.View>

          {/* Formulario */}
          <View style={s.form}>
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
                placeholder="Correo"
                placeholderTextColor={D.textFaint}
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
                placeholderTextColor={D.textFaint}
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
                  ? <EyeOff size={20} color={D.textMuted} />
                  : <Eye size={20} color={D.textMuted} />
                }
              </Pressable>
            </View>

            <PressableScale
              style={[s.btn, loading && s.btnDisabled]}
              onPress={() => { haptic.light(); void handleLogin(); }}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Entrar"
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.btnText}>Entrar</Text>
              }
            </PressableScale>

            {bioListo && (
              <PressableScale
                style={s.bioBtn}
                onPress={() => { haptic.selection(); void entrarConBiometria(); }}
                accessibilityRole="button"
                accessibilityLabel="Entrar con Face ID"
              >
                <ScanFace size={21} color={D.brand} strokeWidth={1.7} />
                <Text style={s.bioBtnText}>Entrar con Face ID</Text>
              </PressableScale>
            )}

            <Link href="/(auth)/olvide-contrasena" asChild>
              <TouchableOpacity style={s.forgotBtn} hitSlop={8} activeOpacity={0.7}>
                <Text style={s.forgotText}>Me olvidé la contraseña</Text>
              </TouchableOpacity>
            </Link>

            {__DEV__ && <DevUserPicker onSelect={(e, p) => { setEmail(e); setPassword(p); }} s={s} />}
          </View>

          {/* Registro */}
          <View style={s.footer}>
            <Text style={s.footerText}>¿Todavía no tenés cuenta? </Text>
            <Link href="/(auth)/registro" asChild>
              <TouchableOpacity hitSlop={8} activeOpacity={0.7}>
                <Text style={s.link}>Crear una</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  // flexGrow + justifyContent: el bloque de marca se come el aire sobrante y
  // queda centrado en él; con el teclado abierto se comprime primero.
  hero: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  title: {
    marginTop: 26,
    fontSize: 34, lineHeight: 38, fontWeight: '700', fontFamily: fontFamily.bold,
    letterSpacing: -1.3, color: D.text,
  },
  subtitle: { marginTop: 12, fontSize: 16, lineHeight: 23, color: D.textMuted },

  form: { gap: 10 },

  errorBox: {
    backgroundColor: D.dangerBg, borderRadius: 18, padding: 14, marginBottom: 2,
  },
  errorText: { fontSize: 14, color: D.danger, lineHeight: 19 },

  inputWrap: {
    height: 58, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: D.surface,
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: D.brand },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    height: '100%', paddingHorizontal: 18,
    fontSize: 17, color: D.text,
  },
  inputFlex: { flex: 1 },
  eyeBtn: { paddingHorizontal: 18, height: '100%', justifyContent: 'center' },

  btn: {
    backgroundColor: D.brandSolid, borderRadius: 20, height: 58,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
    // Sombra teñida con el verde: hace que el botón principal flote sobre el
    // negro sin necesidad de un borde.
    shadowColor: D.brand, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35, shadowRadius: 22, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 17, fontWeight: '600', fontFamily: fontFamily.semibold },

  bioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 58, borderRadius: 20, backgroundColor: D.surface, marginTop: 2,
  },
  bioBtnText: { fontSize: 17, fontWeight: '600', fontFamily: fontFamily.semibold, color: D.text },

  forgotBtn: { alignSelf: 'center', paddingVertical: 8, marginTop: 8 },
  forgotText: { fontSize: 15, color: D.textMuted },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 26, paddingBottom: 12 },
  footerText: { fontSize: 15, color: D.textMuted },
  link: { fontSize: 15, fontWeight: '600', fontFamily: fontFamily.semibold, color: D.brand },

  devBtn: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, marginTop: 2,
    borderRadius: 18, backgroundColor: D.surface,
  },
  devBtnText: { fontSize: 12.5, fontWeight: '600', color: D.textFaint },

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

import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Mail } from 'lucide-react-native';
import api from '../../lib/api';
import { colors } from '../../lib/colors';
import { haptic } from '../../lib/haptics';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { AUTH_DARK as D, AuthDarkBackground } from '../../components/auth-dark';
import { PressableScale } from '../../components/PressableScale';
import { fontFamily } from '../../styles/fonts';

export default function OlvideContrasenaScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!email.trim()) { setError('Ingresá tu email'); haptic.error(); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); haptic.error(); return; }
    setError('');
    setLoading(true);
    haptic.light();
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
      haptic.success();
    } catch {
      setError('No se pudo procesar la solicitud. Intentá de nuevo.');
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
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {/* Chevron de volver: esta pantalla se empuja, no es un índice. */}
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => { haptic.selection(); router.back(); }}
            hitSlop={8}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <ChevronLeft size={21} color={D.text} strokeWidth={2.2} />
          </TouchableOpacity>

          {/* Una sola entrada sobria para todo el cuerpo. */}
          <Animated.View style={s.body} entering={FadeIn.duration(420)}>
            {sent ? (
              <View style={s.sentBox}>
                <View style={s.checkCircle}>
                  <Check size={30} color={D.success} strokeWidth={2.5} />
                </View>
                <Text style={s.title}>Revisá tu correo</Text>
                <Text style={s.subtitle}>
                  Si existe una cuenta con {email}, te llega el enlace para poner una
                  contraseña nueva.
                </Text>
              </View>
            ) : (
              <>
                <Text style={s.title}>¿Te olvidaste{'\n'}la contraseña?</Text>
                <Text style={s.subtitle}>
                  Poné tu correo y te mandamos un enlace para poner una nueva. Llega en
                  un minuto.
                </Text>

                {error ? (
                  <Animated.View style={s.errorBox} entering={FadeIn.duration(200)}>
                    <Text style={s.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                <View style={[s.inputWrap, focused && s.inputWrapFocused]}>
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
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                </View>

                <PressableScale
                  style={[s.btn, loading && s.btnDisabled]}
                  onPress={() => { haptic.light(); void handleSubmit(); }}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel="Mandame el enlace"
                >
                  {loading
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={s.btnText}>Mandame el enlace</Text>}
                </PressableScale>
              </>
            )}

            {/* Ayuda de la maqueta: adelanta la duda que sigue al enviar. */}
            <View style={s.ayuda}>
              <View style={s.ayudaIcono}>
                <Mail size={19} color={D.brand} strokeWidth={1.9} />
              </View>
              <View style={s.flex}>
                <Text style={s.ayudaTitulo}>¿No te llegó?</Text>
                <Text style={s.ayudaTexto}>
                  Mirá en correo no deseado. Si igual no aparece, escribinos y lo
                  resolvemos.
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={s.footer}>
            <Text style={s.footerText}>¿Te acordaste? </Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Text style={s.link}>Entrar</Text>
            </TouchableOpacity>
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

  backBtn: {
    width: 44, height: 44, marginLeft: -12,
    alignItems: 'center', justifyContent: 'center',
  },

  // flexGrow para que el pie quede abajo aunque el cuerpo sea corto.
  body: { flexGrow: 1, paddingTop: 30 },

  title: {
    fontSize: 30, lineHeight: 34, fontWeight: '700', fontFamily: fontFamily.bold,
    letterSpacing: -1.1, color: D.text,
  },
  subtitle: { marginTop: 14, fontSize: 16, lineHeight: 23, color: D.textMuted },

  sentBox: { alignItems: 'center', gap: 4, paddingBottom: 6 },
  checkCircle: {
    width: 64, height: 64, borderRadius: 999, marginBottom: 12,
    backgroundColor: D.successBg,
    justifyContent: 'center', alignItems: 'center',
  },

  errorBox: { marginTop: 18, backgroundColor: D.dangerBg, borderRadius: 18, padding: 14 },
  errorText: { fontSize: 14, color: D.danger, lineHeight: 19 },

  inputWrap: {
    marginTop: 26, height: 58, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: D.surface,
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: D.brand },
  input: { height: '100%', paddingHorizontal: 18, fontSize: 17, color: D.text },

  btn: {
    marginTop: 14, backgroundColor: D.brandSolid, borderRadius: 20, height: 58,
    alignItems: 'center', justifyContent: 'center',
    // Sombra teñida: el botón principal flota sobre el negro sin borde.
    shadowColor: D.brand, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35, shadowRadius: 22, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 17, fontWeight: '600', fontFamily: fontFamily.semibold },

  ayuda: {
    marginTop: 26, backgroundColor: D.surface, borderRadius: 20,
    padding: 16, flexDirection: 'row', gap: 13,
  },
  ayudaIcono: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: D.successBg,
    alignItems: 'center', justifyContent: 'center',
  },
  ayudaTitulo: { fontSize: 16, fontWeight: '600', fontFamily: fontFamily.semibold, color: D.text },
  ayudaTexto: { fontSize: 14, lineHeight: 20, color: D.textMuted, marginTop: 3 },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 26, paddingBottom: 16 },
  footerText: { fontSize: 15, color: D.textMuted },
  link: { fontSize: 15, fontWeight: '600', fontFamily: fontFamily.semibold, color: D.brand },
});

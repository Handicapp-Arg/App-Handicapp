import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, ArrowLeft } from 'lucide-react-native';
import api from '../../lib/api';
import { colors } from '../../lib/colors';
import { haptic } from '../../lib/haptics';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { HorseshoeH } from '../../components/icons/equine';
import { AUTH_DARK as D, AuthDarkBackground, BrandMark } from '../../components/auth-dark';
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
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={s.header} entering={FadeIn.duration(500)}>
            <BrandMark size={96} />
          </Animated.View>

          {sent ? (
            <Animated.View style={s.sentBox} entering={FadeInDown.duration(450)}>
              <View style={s.checkCircle}>
                <Check size={30} color={c.isDark ? '#86efac' : '#15803d'} strokeWidth={2.5} />
              </View>
              <Text style={s.titleCenter}>Revisá tu email</Text>
              <Text style={s.subtitleCenter}>
                Si existe una cuenta con {email}, vas a recibir un enlace para restablecer tu contraseña.
              </Text>
            </Animated.View>
          ) : (
            <>
              <Animated.View style={s.intro} entering={FadeInDown.duration(450).delay(80)}>
                <Text style={s.title}>Recuperar contraseña</Text>
                <Text style={s.subtitle}>
                  Ingresá tu email y te enviamos un enlace para restablecerla.
                </Text>
              </Animated.View>

              <Animated.View style={s.form} entering={FadeInDown.duration(450).delay(160)}>
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
                    placeholder="Correo electrónico"
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

                <Pressable
                  style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color={colors.white} />
                    : <Text style={s.btnText}>Enviar enlace</Text>}
                </Pressable>
              </Animated.View>
            </>
          )}

          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            style={s.linkWrap}
            activeOpacity={0.7}
            hitSlop={6}
          >
            <ArrowLeft size={16} color={c.brand} strokeWidth={2} />
            <Text style={s.link}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bgBottom },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26 },

  header: { alignItems: 'center', marginBottom: 28 },

  intro: { marginBottom: 26 },
  title: {
    fontSize: 32, fontWeight: '700', fontFamily: fontFamily.semibold,
    letterSpacing: -0.8, color: D.text,
  },
  subtitle: { fontSize: 15, color: D.textMuted, marginTop: 6, lineHeight: 21, letterSpacing: -0.1 },

  sentBox: { alignItems: 'center', gap: 14 },
  checkCircle: {
    width: 64, height: 64, borderRadius: 999,
    backgroundColor: c.isDark ? 'rgba(34,197,94,0.16)' : '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
  },
  titleCenter: {
    fontSize: 28, fontWeight: '700', fontFamily: fontFamily.semibold,
    letterSpacing: -0.7, color: D.text, textAlign: 'center',
  },
  subtitleCenter: { fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 21 },

  form: { gap: 12 },

  errorBox: {
    backgroundColor: D.dangerBg, borderRadius: 12, padding: 13,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  errorText: { fontSize: 13.5, color: D.danger },

  inputWrap: {
    height: 56, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: D.field,
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: D.brand, backgroundColor: D.fieldFocus },
  input: {
    height: '100%', paddingHorizontal: 16,
    fontSize: 16.5, color: D.text, letterSpacing: -0.2,
  },

  btn: {
    backgroundColor: D.brand, borderRadius: 14, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2 },

  linkWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 30,
  },
  link: { fontSize: 14.5, fontWeight: '700', color: D.brand },
});

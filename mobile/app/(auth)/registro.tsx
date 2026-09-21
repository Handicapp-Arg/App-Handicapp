import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Check, ChevronLeft, Home, Stethoscope } from 'lucide-react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { haptic } from '../../lib/haptics';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { AUTH_DARK as D, AuthDarkBackground } from '../../components/auth-dark';
import { PressableScale } from '../../components/PressableScale';
import { HorseshoeH } from '../../components/icons/equine';
import { useInvitationByToken, ROLE_LABELS } from '../../hooks/use-organizations';
import { fontFamily } from '../../styles/fonts';
import api from '../../lib/api';

/** Cómo se presenta cada rol en la elección: se habla de lo que hace la
 *  persona, no del nombre técnico del rol (que va abajo, chiquito). */
const ROLE_INFO: Record<string, { label: string; titulo: string; desc: string }> = {
  propietario:     { label: 'Propietario',     titulo: 'Tengo caballos',          desc: 'Propietario' },
  establecimiento: { label: 'Establecimiento', titulo: 'Tengo una caballeriza',   desc: 'Haras, club o pensión' },
  veterinario:     { label: 'Veterinario',     titulo: 'Trabajo con caballos',    desc: 'Veterinario, herrero, jinete' },
};

function IconoRol({ rol, activo }: { rol: string; activo: boolean }) {
  const color = activo ? D.brand : D.textMuted;
  if (rol === 'establecimiento') return <Home size={22} color={color} strokeWidth={1.8} />;
  if (rol === 'veterinario') return <Stethoscope size={22} color={color} strokeWidth={1.8} />;
  return <HorseshoeH size={22} color={color} />;
}

export default function RegistroScreen() {
  const { register } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);
  const { invitation: invitationToken } = useLocalSearchParams<{ invitation?: string }>();
  // Con invitación el rol lo define el link; ocultamos el paso de elección.
  const { data: invitation } = useInvitationByToken(invitationToken || null);

  const apellidoRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('propietario');
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [focused, setFocused] = useState<'nombre' | 'apellido' | 'email' | 'password' | null>(null);
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
  // Con invitación el rol ya viene dado: el flujo se acorta a dos pasos.
  const totalPasos = invitationToken ? 2 : 3;
  const nombreCompleto = [nombre.trim(), apellido.trim()].filter(Boolean).join(' ');

  /** Fuerza de la contraseña, 0 a 4 — solo indicador visual; la validación
   *  real sigue siendo la de siempre (mínimo 6 caracteres). */
  const fuerza = useMemo(() => {
    let n = 0;
    if (password.length >= 6) n++;
    if (password.length >= 10) n++;
    if (/\d/.test(password)) n++;
    if (/[^a-zA-Z0-9]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) n++;
    return n;
  }, [password]);

  const volver = () => {
    haptic.selection();
    if (paso > 1) { setError(''); setPaso(p => p - 1); return; }
    router.back();
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    if (!nombreCompleto || !email || !password || !role) { setError('Completá todos los campos'); haptic.error(); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); haptic.error(); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); haptic.error(); return; }
    setError('');
    setLoading(true);
    haptic.light();
    try {
      // Con invitación el backend deriva el rol de la invitación; role va como fallback.
      await register(email.trim().toLowerCase(), password, nombreCompleto, role, invitationToken || undefined);
      haptic.success();
    } catch {
      setError('No se pudo crear la cuenta. El email puede estar en uso o no coincidir con la invitación.');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  /** Avanza de paso validando solo lo del paso actual, o crea la cuenta si es el último. */
  const seguir = () => {
    if (paso === 1) {
      if (!nombreCompleto) { setError('Escribí tu nombre'); haptic.error(); return; }
      setError(''); haptic.light(); Keyboard.dismiss(); setPaso(2); return;
    }
    if (paso === 2) {
      if (!/\S+@\S+\.\S+/.test(email)) { setError('Email inválido'); haptic.error(); return; }
      if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); haptic.error(); return; }
      setError(''); haptic.light(); Keyboard.dismiss();
      if (totalPasos === 2) { void handleRegister(); return; }
      setPaso(3); return;
    }
    void handleRegister();
  };

  const esUltimo = paso === totalPasos;
  const rolesVisibles = roles.filter(r => ROLE_INFO[r.name]);

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
          {/* Encabezado: volver + progreso. El progreso es lo que hace que un
              formulario largo se sienta corto. */}
          <View style={s.top}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={volver}
              hitSlop={8}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <ChevronLeft size={21} color={D.text} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={s.progreso}>
              {Array.from({ length: totalPasos }).map((_, i) => (
                <View key={i} style={[s.progresoTramo, i < paso && s.progresoTramoHecho]} />
              ))}
            </View>
          </View>

          {/* Una sola entrada por paso: cambia de key, así el cuerpo aparece
              suave al avanzar sin cinco animaciones compitiendo. */}
          <Animated.View key={paso} style={s.body} entering={FadeIn.duration(260)}>
            {paso === 1 && (
              <>
                <Text style={s.title}>¿Cómo te{'\n'}llamás?</Text>
                <Text style={s.subtitle}>Así te reconocen los demás en la app.</Text>

                {invitation ? (
                  <View style={s.inviteBox}>
                    <Text style={s.inviteText}>
                      Te unís a <Text style={s.inviteStrong}>{invitation.organization.name}</Text> como{' '}
                      <Text style={s.inviteRole}>{ROLE_LABELS[invitation.role_in_org]}</Text>.
                    </Text>
                  </View>
                ) : null}

                <View style={s.campos}>
                  <View style={[s.inputWrap, focused === 'nombre' && s.inputWrapFocused]}>
                    <TextInput
                      style={s.input}
                      value={nombre}
                      onChangeText={setNombre}
                      placeholder="Nombre"
                      placeholderTextColor={D.textFaint}
                      autoCapitalize="words"
                      autoComplete="given-name"
                      textContentType="givenName"
                      returnKeyType="next"
                      onSubmitEditing={() => apellidoRef.current?.focus()}
                      onFocus={() => setFocused('nombre')}
                      onBlur={() => setFocused(null)}
                      submitBehavior="submit"
                    />
                  </View>
                  <View style={[s.inputWrap, focused === 'apellido' && s.inputWrapFocused]}>
                    <TextInput
                      ref={apellidoRef}
                      style={s.input}
                      value={apellido}
                      onChangeText={setApellido}
                      placeholder="Apellido"
                      placeholderTextColor={D.textFaint}
                      autoCapitalize="words"
                      autoComplete="family-name"
                      textContentType="familyName"
                      returnKeyType="go"
                      onSubmitEditing={seguir}
                      onFocus={() => setFocused('apellido')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>
                </View>
              </>
            )}

            {paso === 2 && (
              <>
                <Text style={s.title}>Tu correo y{'\n'}tu contraseña</Text>
                <Text style={s.subtitle}>Con esto entrás de acá en adelante.</Text>

                <View style={s.campos}>
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
                      placeholder="Correo"
                      placeholderTextColor={D.textFaint}
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
                      placeholder="Contraseña"
                      placeholderTextColor={D.textFaint}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      returnKeyType="go"
                      onSubmitEditing={seguir}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                    />
                  </View>

                  <View style={s.fuerza}>
                    {[0, 1, 2, 3].map(i => (
                      <View key={i} style={[s.fuerzaTramo, i < fuerza && s.fuerzaTramoLleno]} />
                    ))}
                  </View>
                  <Text style={s.pista}>Seis caracteres o más, mejor con un número.</Text>
                </View>
              </>
            )}

            {paso === 3 && (
              <>
                <Text style={s.title}>¿Qué hacés{'\n'}con caballos?</Text>
                <Text style={s.subtitle}>Con esto armamos tu pantalla de inicio.</Text>

                <View style={s.tarjetas}>
                  {rolesVisibles.map(r => {
                    const info = ROLE_INFO[r.name];
                    const activo = role === r.name;
                    return (
                      <PressableScale
                        key={r.id}
                        style={[s.tarjeta, activo && s.tarjetaActiva]}
                        scaleTo={0.98}
                        onPress={() => { haptic.selection(); setRole(r.name); }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activo }}
                        accessibilityLabel={info.label}
                      >
                        <View style={[s.tarjetaIcono, activo && s.tarjetaIconoActivo]}>
                          <IconoRol rol={r.name} activo={activo} />
                        </View>
                        <View style={s.flex}>
                          <Text style={s.tarjetaTitulo}>{info.titulo}</Text>
                          <Text style={s.tarjetaDesc}>{info.desc}</Text>
                        </View>
                        {activo && <Check size={21} color={D.brand} strokeWidth={2.4} />}
                      </PressableScale>
                    );
                  })}
                </View>
              </>
            )}

            {error ? (
              <Animated.View style={s.errorBox} entering={FadeIn.duration(200)}>
                <Text style={s.errorText}>{error}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>

          {/* Pie fijo abajo: una sola acción por paso. */}
          <View style={s.footer}>
            <PressableScale
              style={[s.btn, loading && s.btnDisabled]}
              onPress={seguir}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={esUltimo ? 'Crear mi cuenta' : 'Seguir'}
            >
              {loading
                ? <ActivityIndicator color={colors.white} />
                : <Text style={s.btnText}>{esUltimo ? 'Crear mi cuenta' : 'Seguir'}</Text>
              }
            </PressableScale>

            {esUltimo ? (
              <Text style={s.legal}>Al crearla aceptás los términos y la privacidad</Text>
            ) : (
              <View style={s.volverLogin}>
                <Text style={s.footerText}>¿Ya tenés cuenta? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity hitSlop={8} activeOpacity={0.7}>
                    <Text style={s.link}>Entrar</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            )}
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

  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  progreso: { flex: 1, flexDirection: 'row', gap: 6, paddingRight: 32 },
  progresoTramo: { flex: 1, height: 4, borderRadius: 999, backgroundColor: D.surface },
  progresoTramoHecho: { backgroundColor: D.brand },

  // flexGrow: el cuerpo se estira y empuja el botón al borde de abajo.
  body: { flexGrow: 1, paddingTop: 30 },

  title: {
    fontSize: 32, lineHeight: 36, fontWeight: '700', fontFamily: fontFamily.bold,
    letterSpacing: -1.2, color: D.text,
  },
  subtitle: { marginTop: 10, fontSize: 16, lineHeight: 23, color: D.textMuted },

  campos: { marginTop: 30, gap: 14 },

  inputWrap: {
    height: 58, borderRadius: 18,
    borderWidth: 1.5, borderColor: 'transparent',
    backgroundColor: D.surface,
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: D.brand },
  inputWrapDisabled: { opacity: 0.6 },
  input: { height: '100%', paddingHorizontal: 18, fontSize: 17, color: D.text },

  fuerza: { flexDirection: 'row', gap: 6 },
  fuerzaTramo: { flex: 1, height: 5, borderRadius: 999, backgroundColor: D.surface },
  fuerzaTramoLleno: { backgroundColor: D.brand },
  pista: { fontSize: 14, color: D.textMuted },

  tarjetas: { marginTop: 26, gap: 12 },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: D.surface, borderRadius: 22, padding: 17,
    borderWidth: 2, borderColor: 'transparent',
  },
  tarjetaActiva: { borderColor: D.brand },
  tarjetaIcono: {
    width: 46, height: 46, borderRadius: 16, backgroundColor: D.field,
    alignItems: 'center', justifyContent: 'center',
  },
  tarjetaIconoActivo: { backgroundColor: D.successBg },
  tarjetaTitulo: { fontSize: 18, fontWeight: '600', fontFamily: fontFamily.semibold, color: D.text },
  tarjetaDesc: { fontSize: 14, color: D.textMuted, marginTop: 2 },

  inviteBox: { marginTop: 20, backgroundColor: D.surface, borderRadius: 18, padding: 14 },
  inviteText: { fontSize: 14, color: D.textMuted, lineHeight: 20 },
  inviteStrong: { fontWeight: '700', color: D.text },
  inviteRole: { fontWeight: '700', color: D.brand },

  errorBox: { marginTop: 18, backgroundColor: D.dangerBg, borderRadius: 18, padding: 14 },
  errorText: { fontSize: 14, color: D.danger, lineHeight: 19 },

  footer: { paddingTop: 26 },
  btn: {
    backgroundColor: D.brandSolid, borderRadius: 20, height: 58,
    alignItems: 'center', justifyContent: 'center',
    // Sombra teñida: el botón principal flota sobre el negro sin borde.
    shadowColor: D.brand, shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35, shadowRadius: 22, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 17, fontWeight: '600', fontFamily: fontFamily.semibold },

  legal: { marginTop: 12, textAlign: 'center', fontSize: 13, lineHeight: 18, color: D.textFaint },
  volverLogin: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 15, color: D.textMuted },
  link: { fontSize: 15, fontWeight: '600', fontFamily: fontFamily.semibold, color: D.brand },
});

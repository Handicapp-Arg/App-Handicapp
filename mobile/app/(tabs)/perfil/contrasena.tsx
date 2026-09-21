import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Switch,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Check, Circle, ScanFace } from 'lucide-react-native';

import { useAuth } from '../../../lib/auth';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useToast } from '../../../components/Toast';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { biometriaDisponible, hayCredencialesGuardadas, borrarCredencialesBiometricas } from '../../../lib/biometria';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { useCommonStyles } from '../../../styles/common';
import { entradaFila } from '../../../styles/motion';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';

/**
 * Fuerza de la contraseña. Son PISTAS, no requisitos: el mínimo real que valida
 * el back son 6 caracteres, y no lo endurecemos desde la UI porque dejaría
 * afuera a gente que ya tiene su clave puesta.
 */
const REQUISITOS = [
  { key: 'largo', label: 'Ocho caracteres o más', test: (v: string) => v.length >= 8 },
  { key: 'numero', label: 'Con un número', test: (v: string) => /\d/.test(v) },
  { key: 'mayus', label: 'Con una mayúscula', test: (v: string) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
  { key: 'extra', label: 'Doce o más, mejor todavía', test: (v: string) => v.length >= 12 },
];

const FUERZA_LABEL = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];

/** Cambiar contraseña — pantalla empujada, patrón Ajustes de iOS. */
export default function CambiarContrasenaScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle, button, typography } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const { changePassword } = useAuth();
  const toast = useToast();

  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [focus, setFocus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  // Face ID: la app guarda las credenciales al entrar con contraseña. Acá se
  // puede APAGAR (borrar el llavero); encenderlo requiere una contraseña ya
  // verificada, así que eso pasa solo en el próximo ingreso manual.
  const [bioDisponible, setBioDisponible] = useState(false);
  const [bioActiva, setBioActiva] = useState(false);

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [disp, guardadas] = await Promise.all([biometriaDisponible(), hayCredencialesGuardadas()]);
      if (!vivo) return;
      setBioDisponible(disp);
      setBioActiva(guardadas);
    })();
    return () => { vivo = false; };
  }, []);

  const isDirty = !!current || !!newPass || !!confirm;
  const canSubmit = !!current && !!newPass && !!confirm && !saving;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardado.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar cambios?', 'Vas a perder lo que escribiste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSave = async () => {
    if (!current || !newPass || !confirm) { setError('Completá todos los campos'); haptic.error(); return; }
    if (newPass.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); haptic.error(); return; }
    if (newPass !== confirm) { setError('Las contraseñas no coinciden'); haptic.error(); return; }
    setError('');
    setSaving(true);
    try {
      await changePassword(current, newPass);
      haptic.success();
      toast.success('Contraseña actualizada');
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('Contraseña actual incorrecta o error del servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleBio = async (next: boolean) => {
    haptic.selection();
    if (next) {
      // No guardamos credenciales sin verificar: se activa sola al entrar.
      toast.info('Se activa sola la próxima vez que entres con tu contraseña');
      return;
    }
    setBioActiva(false);
    await borrarCredencialesBiometricas();
    toast.success('Face ID desactivado');
  };

  const cumplidos = REQUISITOS.filter((r) => r.test(newPass));
  const fuerza = newPass ? cumplidos.length : 0;
  const colorFuerza = fuerza >= 3 ? c.brand : fuerza === 2 ? c.warning : c.danger;

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Contraseña" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Animated.View entering={entradaFila(0)} style={s.bloque}>
          <Text style={typography.sectionEyebrow}>La de ahora</Text>
          <TextInput
            style={[inputStyle.base, focus === 'actual' && inputStyle.focused]}
            value={current}
            onChangeText={setCurrent}
            onFocus={() => setFocus('actual')}
            onBlur={() => setFocus(null)}
            secureTextEntry
            placeholder="Contraseña actual"
            placeholderTextColor={c.textFaint}
            autoComplete="off"
            textContentType="password"
            returnKeyType="next"
          />
        </Animated.View>

        <Animated.View entering={entradaFila(1)} style={s.bloque}>
          <Text style={typography.sectionEyebrow}>La nueva</Text>
          <TextInput
            style={[inputStyle.base, focus === 'nueva' && inputStyle.focused]}
            value={newPass}
            onChangeText={setNewPass}
            onFocus={() => setFocus('nueva')}
            onBlur={() => setFocus(null)}
            secureTextEntry
            placeholder="Nueva contraseña"
            placeholderTextColor={c.textFaint}
            autoComplete="off"
            textContentType="newPassword"
            returnKeyType="next"
          />

          {/* Medidor: cuatro barras, una por pista cumplida. */}
          <View style={s.medidor}>
            {REQUISITOS.map((r, i) => (
              <View
                key={r.key}
                style={[s.medidorBarra, { backgroundColor: i < fuerza ? colorFuerza : c.border }]}
              />
            ))}
          </View>
          {newPass ? (
            <Text style={[s.fuerzaLabel, { color: colorFuerza }]}>{FUERZA_LABEL[fuerza]}</Text>
          ) : null}

          <View style={s.checklist}>
            {REQUISITOS.map((r) => {
              const ok = r.test(newPass);
              return (
                <View key={r.key} style={s.checkRow}>
                  {ok
                    ? <Check size={17} color={c.brand} strokeWidth={2.4} />
                    : <Circle size={17} color={c.borderStrong} strokeWidth={2.4} />}
                  <Text style={[s.checkText, !ok && s.checkTextOff]}>{r.label}</Text>
                </View>
              );
            })}
          </View>

          <TextInput
            style={[inputStyle.base, focus === 'confirmar' && inputStyle.focused, s.confirmar]}
            value={confirm}
            onChangeText={setConfirm}
            onFocus={() => setFocus('confirmar')}
            onBlur={() => setFocus(null)}
            secureTextEntry
            placeholder="Repetir la nueva"
            placeholderTextColor={c.textFaint}
            autoComplete="off"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleSave}
          />
          {error ? <Text style={s.errorText}>{error}</Text> : null}
        </Animated.View>

        {bioDisponible && (
          <Animated.View entering={entradaFila(2)} style={s.bioCard}>
            <View style={s.bioIcon}>
              <ScanFace size={19} color={c.brand} strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bioTitulo}>Entrar con Face ID</Text>
              <Text style={s.bioSub}>
                {bioActiva ? 'Así no la escribís cada vez' : 'Se activa cuando entrés con tu contraseña'}
              </Text>
            </View>
            <Switch
              value={bioActiva}
              onValueChange={handleBio}
              trackColor={{ false: c.borderStrong, true: c.brand }}
            />
          </Animated.View>
        )}
      </ScrollView>

      {/* Un solo CTA: el verde vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[button.primary, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSave}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Cambiar la contraseña"
        >
          {saving
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={button.primaryText}>Cambiar la contraseña</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[8] },
  bloque: { gap: space[3], marginBottom: space[6] },
  errorText: { fontSize: text.sm, color: c.danger },

  medidor: { flexDirection: 'row', gap: space[1] + 2, marginTop: space[1] },
  medidorBarra: { flex: 1, height: 5, borderRadius: radius.full },
  fuerzaLabel: { fontSize: text.sm, fontWeight: weight.semibold, marginTop: -space[1] },

  checklist: { gap: space[2] + 1, marginTop: space[1] },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] + 2 },
  checkText: { fontSize: text.base, color: c.textMuted },
  checkTextOff: { color: c.textFaint },

  confirmar: { marginTop: space[2] },

  // Tarjeta blanca sobre el crema: la única pieza elevada de la pantalla.
  bioCard: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: c.surface, borderRadius: radius.card,
    padding: space[4],
    // En oscuro la sombra no se ve: la jerarquia la da surface sobre bg.
    ...(c.isDark ? {} : shadow.sm),
  },
  bioIcon: {
    width: 40, height: 40, borderRadius: radius.thumb,
    backgroundColor: c.brandSoft, alignItems: 'center', justifyContent: 'center',
  },
  bioTitulo: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  bioSub: { fontSize: text.xs, color: c.textMuted, marginTop: 2 },

  footer: { paddingHorizontal: space[5], paddingTop: space[3] },
});

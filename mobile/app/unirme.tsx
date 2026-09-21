import { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { Routes } from '../lib/routes';
import { useToast } from '../components/Toast';
import { useRequestJoin } from '../hooks/use-organizations';
import { PressableScale } from '../components/PressableScale';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../styles/tokens';
import { entradaFila } from '../styles/motion';

/** El backend genera códigos de 8 caracteres (organizations/join-code.util.ts). */
const LARGO_CODIGO = 8;

const LO_QUE_PASA = [
  'Tus caballos quedan en esa caballeriza',
  'Ves las facturas que te emitan',
  'Su gente puede cargar la rutina diaria',
];

export default function UnirmeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);
  const requestJoin = useRequestJoin();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [foco, setFoco] = useState(false);
  // Un solo input real, invisible, detrás de las celdas: es lo que hace que el
  // teclado y el pegado funcionen sin pelear con ocho campos encadenados.
  const inputRef = useRef<TextInput>(null);

  const canSubmit = code.trim().length > 0 && !requestJoin.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    haptic.light();
    requestJoin.mutate(
      { join_code: code.trim(), message: message.trim() || undefined },
      {
        onSuccess: () => {
          haptic.success();
          toast.success('Pedido enviado');
          router.back();
        },
        onError: () => {
          haptic.error();
          toast.error('No se pudo enviar. Revisá el código.');
        },
      },
    );
  };

  const celdas = Array.from({ length: LARGO_CODIGO }, (_, i) => code[i] ?? '');
  const activa = Math.min(code.length, LARGO_CODIGO - 1);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <ScreenHeader scrollable title="Unirme" showBack backTo={Routes.mas} />

          <View style={s.cuerpo}>
            <Text style={s.lead}>
              Poné el código que te pasó la caballeriza. Son ocho caracteres.
            </Text>

            {/* Celdas del código */}
            <Pressable
              style={s.celdas}
              onPress={() => { haptic.selection(); inputRef.current?.focus(); }}
              accessibilityRole="button"
              accessibilityLabel="Escribir el código de invitación"
            >
              {celdas.map((ch, i) => (
                <View
                  key={i}
                  style={[
                    s.celda,
                    ch ? s.celdaLlena : s.celdaVacia,
                    foco && i === activa && s.celdaActiva,
                  ]}
                >
                  <Text style={s.celdaText}>{ch}</Text>
                </View>
              ))}
              <TextInput
                ref={inputRef}
                style={s.inputOculto}
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase().replace(/\s/g, '').slice(0, LARGO_CODIGO))}
                onFocus={() => setFoco(true)}
                onBlur={() => setFoco(false)}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                maxLength={LARGO_CODIGO}
                keyboardType="default"
              />
            </Pressable>

            <Text style={s.grupo}>Al unirte</Text>
            {LO_QUE_PASA.map((linea, i) => (
              <Animated.View key={linea} entering={entradaFila(i)} style={s.beneficio}>
                <Check size={18} color={c.brand} strokeWidth={2.4} />
                <Text style={s.beneficioText}>{linea}</Text>
              </Animated.View>
            ))}
            <Text style={s.nota}>
              Podés salir cuando quieras. Tus caballos y su historial siguen siendo tuyos.
            </Text>

            <TextInput
              style={s.mensaje}
              value={message}
              onChangeText={setMessage}
              placeholder="Mensaje (opcional): contales quién sos…"
              placeholderTextColor={c.textFaint}
              multiline
            />
          </View>
        </ScrollView>

        {/* Un solo CTA: el back del header ya cancela. */}
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          <PressableScale
            style={[s.cta, !canSubmit && { opacity: 0.5 }]}
            disabled={!canSubmit}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel="Enviar el pedido para unirme"
          >
            {requestJoin.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.ctaText}>Unirme</Text>}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: space[10] },
  cuerpo: { paddingHorizontal: space[4], paddingTop: space[2] },

  lead: { fontSize: text.md, color: c.textMuted, lineHeight: 24 },

  celdas: { flexDirection: 'row', gap: space[1] + 1, marginTop: space[6] },
  celda: { flex: 1, height: 64, borderRadius: radius.field, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  celdaVacia: { backgroundColor: c.surfaceAlt },
  celdaLlena: { backgroundColor: c.surface, ...(c.isDark ? {} : shadow.sm) },
  celdaActiva: { borderColor: c.brand },
  celdaText: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  // Invisible pero presente: si lo sacamos del layout, iOS no abre el teclado.
  inputOculto: { position: 'absolute', opacity: 0, width: '100%', height: '100%' },

  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginTop: space[8], marginBottom: space[3] },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[2] },
  beneficioText: { flex: 1, fontSize: text.base, color: c.text },
  nota: { fontSize: text.sm, color: c.textFaint, lineHeight: 20, marginTop: space[4] },

  mensaje: {
    marginTop: space[6], borderRadius: radius.field, backgroundColor: c.surfaceAlt,
    paddingHorizontal: space[4], paddingVertical: space[3],
    minHeight: 88, textAlignVertical: 'top', fontSize: text.base, color: c.text,
  },

  footer: { paddingHorizontal: space[4], paddingTop: space[3], backgroundColor: c.bg },
  cta: {
    height: touch.button, borderRadius: radius.button, backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center', ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});

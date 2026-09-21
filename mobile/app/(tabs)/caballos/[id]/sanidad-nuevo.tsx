import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { ShieldCheck, Syringe, Bug, Microscope, Pill, type LucideIcon } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import {
  useAddMedicalRecord, MEDICAL_TYPE_LABELS, type CreateMedicalRecordDto,
} from '../../../../hooks/use-medical';
import { useHorse } from '../../../../hooks/use-horses';
import { todayISO } from '../../../../hooks/use-routines';
import { DatePicker } from '../../../../components/DatePicker';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { useToast } from '../../../../components/Toast';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { useCommonStyles } from '../../../../styles/common';

const MEDICAL_TYPES = ['vacuna', 'desparasitacion', 'analisis', 'tratamiento', 'sanidad'] as const;

const MEDICAL_TYPE_ICONS: Record<string, LucideIcon> = {
  vacuna: Syringe,
  desparasitacion: Bug,
  analisis: Microscope,
  tratamiento: Pill,
  sanidad: ShieldCheck,
};

export default function SanidadNuevoScreen() {
  const params = useLocalSearchParams<{ id: string; type?: string; name?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  // Prefill opcional (p. ej. "Certificar" desde la libreta sanitaria pasa type=sanidad&name=...)
  const initialType = (MEDICAL_TYPES as readonly string[]).includes(params.type ?? '')
    ? (params.type as CreateMedicalRecordDto['type'])
    : 'vacuna';
  const initialName = typeof params.name === 'string' ? params.name : '';

  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();

  const { data: horse } = useHorse(id);
  const addMedical = useAddMedicalRecord(id);
  const today = todayISO();

  const [form, setForm] = useState<CreateMedicalRecordDto>({ type: initialType, name: initialName, date: today });
  const [error, setError] = useState('');
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  const isDirty = form.name !== initialName || !!form.brand || !!form.notes || !!form.next_due;
  const canSubmit = !!form.name.trim() && !addMedical.isPending;

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty || guardado.current) return;
      e.preventDefault();
      Alert.alert('¿Descartar el registro?', 'Vas a perder lo que escribiste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Escribí el nombre o producto'); haptic.error(); return; }
    setError('');
    try {
      await addMedical.mutateAsync(form);
      haptic.success();
      toast.success('Registro médico agregado');
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo guardar el registro. Intentá de nuevo.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Registrar sanidad" subtitle={horse?.name} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ─── Qué le hiciste: el tipo se elige de un vistazo, no en una hoja ─── */}
        <View>
          <Text style={s.rotulo}>Qué le hiciste</Text>
          <View style={s.grilla}>
            {MEDICAL_TYPES.map((t, i) => {
              const activo = form.type === t;
              const Icono = MEDICAL_TYPE_ICONS[t];
              return (
                <Animated.View key={t} entering={entradaFila(i)} style={s.grillaCelda}>
                  <PressableScale
                    style={[s.tipoBtn, activo ? s.tipoBtnActivo : s.tipoBtnInactivo]}
                    onPress={() => { haptic.selection(); setForm((p) => ({ ...p, type: t })); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                    accessibilityLabel={MEDICAL_TYPE_LABELS[t]}
                  >
                    <View style={[s.tipoIcono, activo ? s.tipoIconoActivo : s.tipoIconoInactivo]}>
                      <Icono size={17} color={activo ? c.text : c.textMuted} strokeWidth={1.9} />
                    </View>
                    <Text style={[s.tipoLabel, activo && s.tipoLabelActivo]} numberOfLines={1}>
                      {MEDICAL_TYPE_LABELS[t]}
                    </Text>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        </View>

        <TextInput
          style={inputStyle.base}
          value={form.name}
          onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
          placeholder="Qué se aplicó, ej: Influenza equina"
          placeholderTextColor={c.textFaint}
          returnKeyType="next"
        />

        {/* Filas de selección: cuándo se hizo y cuándo vuelve a vencer. */}
        <View>
          <DatePicker label="Cuándo" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} maxDate={new Date()} />
          <DatePicker label="Vuelve a vencer" value={form.next_due ?? ''} onChange={(v) => setForm((p) => ({ ...p, next_due: v || undefined }))} />
        </View>

        <TextInput
          style={inputStyle.base}
          value={form.brand ?? ''}
          onChangeText={(v) => setForm((p) => ({ ...p, brand: v || undefined }))}
          placeholder="Marca o laboratorio (opcional)"
          placeholderTextColor={c.textFaint}
          returnKeyType="next"
        />
        <TextInput
          style={[inputStyle.multiline, { minHeight: 96 }]}
          value={form.notes ?? ''}
          onChangeText={(v) => setForm((p) => ({ ...p, notes: v || undefined }))}
          placeholder="Notas u observaciones"
          placeholderTextColor={c.textFaint}
          multiline
        />

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el verde vive acá y en ningún otro lado. */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.cta, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Guardar registro médico"
        >
          {addMedical.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.ctaText}>Guardar</Text>}
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[8], gap: space[5] },
  rotulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginBottom: space[3] },

  /* Grilla de tipos: dos columnas, el elegido pasa a tinta. */
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] + 2 },
  grillaCelda: { width: '48%' },
  tipoBtn: { height: 76, borderRadius: radius.button, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4] },
  tipoBtnActivo: { backgroundColor: c.text },
  tipoBtnInactivo: { backgroundColor: c.surface, ...(c.isDark ? {} : shadow.sm) },
  tipoIcono: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  // Sobre la tarjeta de tinta el recuadro se pinta con el fondo de pantalla y
  // el ícono con la tinta: el par se invierte solo al cambiar de tema.
  tipoIconoActivo: { backgroundColor: c.bg },
  tipoIconoInactivo: { backgroundColor: c.surfaceAlt },
  tipoLabel: { flex: 1, fontSize: text.sm + 1, fontWeight: weight.medium, color: c.textMuted },
  tipoLabelActivo: { color: c.bg, fontWeight: weight.semibold },

  errorText: { fontSize: text.sm, color: c.danger },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  cta: {
    height: touch.button, borderRadius: radius.button, backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});

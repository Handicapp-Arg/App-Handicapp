import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { ShieldCheck, Syringe, Bug, Microscope, Pill, type LucideIcon } from 'lucide-react-native';

import {
  useAddMedicalRecord, MEDICAL_TYPE_LABELS, type CreateMedicalRecordDto,
} from '../../../../hooks/use-medical';
import { useHorse } from '../../../../hooks/use-horses';
import { todayISO } from '../../../../hooks/use-routines';
import { DatePicker } from '../../../../components/DatePicker';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { ActionSheet } from '../../../../components/ActionSheet';
import { FilaSelector } from '../../../../components/FilaSelector';
import { useToast } from '../../../../components/Toast';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../../styles/tokens';
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
  const [showTipoSheet, setShowTipoSheet] = useState(false);
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
      <ScreenHeader scrollable showBack title="Nuevo registro médico" subtitle={horse?.name} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Fila de selección, patrón Ajustes de iOS */}
        <View>
          <FilaSelector
            primera
            label="Tipo"
            valor={MEDICAL_TYPE_LABELS[form.type]}
            onPress={() => setShowTipoSheet(true)}
          />
        </View>

        <TextInput
          style={inputStyle.base}
          value={form.name}
          onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
          placeholder="Nombre / producto, ej: Triple viral"
          placeholderTextColor={c.textFaint}
          returnKeyType="next"
        />

        <DatePicker label="Fecha *" value={form.date} onChange={(v) => setForm((p) => ({ ...p, date: v }))} maxDate={new Date()} />
        <DatePicker label="Próxima dosis" value={form.next_due ?? ''} onChange={(v) => setForm((p) => ({ ...p, next_due: v || undefined }))} />

        <TextInput
          style={inputStyle.base}
          value={form.brand ?? ''}
          onChangeText={(v) => setForm((p) => ({ ...p, brand: v || undefined }))}
          placeholder="Marca / laboratorio (opcional)"
          placeholderTextColor={c.textFaint}
          returnKeyType="next"
        />
        <TextInput
          style={[inputStyle.multiline, { minHeight: 96 }]}
          value={form.notes ?? ''}
          onChangeText={(v) => setForm((p) => ({ ...p, notes: v || undefined }))}
          placeholder="Notas / observaciones adicionales"
          placeholderTextColor={c.textFaint}
          multiline
        />

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el cuero vive acá y en ningún otro lado */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Guardar registro médico"
        >
          {addMedical.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <ActionSheet
        visible={showTipoSheet}
        onClose={() => setShowTipoSheet(false)}
        title="Tipo de registro"
        acciones={MEDICAL_TYPES.map((t) => ({
          label: MEDICAL_TYPE_LABELS[t],
          Icon: MEDICAL_TYPE_ICONS[t],
          onPress: () => setForm((p) => ({ ...p, type: t })),
        }))}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  errorText: { fontSize: text.sm, color: colors.red500 },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});

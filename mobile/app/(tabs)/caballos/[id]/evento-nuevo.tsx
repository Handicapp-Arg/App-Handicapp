import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { FileText, Dumbbell, Syringe, Flag } from 'lucide-react-native';

import { useHorse } from '../../../../hooks/use-horses';
import { useCreateEvent } from '../../../../hooks/use-events';
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

const EVENT_TYPE_OPTS = [
  { key: 'nota', label: 'Nota', Icon: FileText },
  { key: 'entrenamiento', label: 'Entrenamiento', Icon: Dumbbell },
  { key: 'salud', label: 'Salud', Icon: Syringe },
  { key: 'carrera', label: 'Carrera', Icon: Flag },
] as const;

type EventType = (typeof EVENT_TYPE_OPTS)[number]['key'];

const PLACEHOLDERS: Record<EventType, string> = {
  nota: 'Ej: El caballo come bien, buen estado general',
  entrenamiento: 'Ej: Galope 1200m, tiempo 1:14, buena respuesta',
  salud: 'Ej: Vacunación influenza equina Dr. García',
  carrera: 'Ej: Gran Premio Palermo 1200m - 3° puesto',
};

export default function EventoNuevoScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { input: inputStyle } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const toast = useToast();

  // El caballo viene implícito por la ruta: no hace falta selector.
  const { data: horse } = useHorse(id);
  const createEvent = useCreateEvent();
  const today = todayISO();

  const [type, setType] = useState<EventType>('nota');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');
  const [showTipoSheet, setShowTipoSheet] = useState(false);
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  const isDirty = !!description.trim();
  const canSubmit = !!description.trim() && !createEvent.isPending;

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

  const handleSubmit = async () => {
    if (!description.trim()) { setError('La descripción es obligatoria'); haptic.error(); return; }
    setError('');
    try {
      await createEvent.mutateAsync({
        type,
        description: description.trim(),
        date,
        horse_id: id,
      });
      haptic.success();
      toast.success('Evento agregado');
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo guardar el evento.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Nuevo evento" subtitle={horse?.name} />
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
            valor={EVENT_TYPE_OPTS.find((t) => t.key === type)?.label}
            onPress={() => setShowTipoSheet(true)}
          />
        </View>

        <DatePicker label="Fecha" value={date} onChange={setDate} maxDate={new Date()} />

        <TextInput
          style={[inputStyle.multiline, { minHeight: 96 }]}
          value={description}
          onChangeText={setDescription}
          placeholder={PLACEHOLDERS[type]}
          placeholderTextColor={c.textFaint}
          multiline
          autoCapitalize="sentences"
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
          accessibilityLabel="Guardar evento"
        >
          {createEvent.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Guardar</Text>
          }
        </TouchableOpacity>
      </View>

      <ActionSheet
        visible={showTipoSheet}
        onClose={() => setShowTipoSheet(false)}
        title="Tipo de evento"
        acciones={EVENT_TYPE_OPTS.map((t) => ({
          label: t.label,
          Icon: t.Icon,
          onPress: () => setType(t.key),
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

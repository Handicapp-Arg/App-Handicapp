import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import {
  FileText, Dumbbell, Syringe, Flag, Receipt,
  Wheat, Hammer, Activity, Wrench, Truck, Package,
} from 'lucide-react-native';

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
import { CURRENCY_OPTIONS, type Currency } from '../../../../lib/currency';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../../styles/tokens';
import { useCommonStyles } from '../../../../styles/common';

const EVENT_TYPE_OPTS = [
  { key: 'nota', label: 'Nota', Icon: FileText },
  { key: 'entrenamiento', label: 'Entrenamiento', Icon: Dumbbell },
  { key: 'salud', label: 'Salud', Icon: Syringe },
  { key: 'carrera', label: 'Carrera', Icon: Flag },
  { key: 'gasto', label: 'Gasto', Icon: Receipt },
] as const;

type EventType = (typeof EVENT_TYPE_OPTS)[number]['key'];

/** Mismas categorías que `eventos/nuevo.tsx`: el gasto se carga igual desde los dos lados. */
const EXPENSE_CATEGORIES = [
  { value: 'alimentacion',  label: 'Alimento',      Icon: Wheat },
  { value: 'veterinario',   label: 'Veterinario',   Icon: Syringe },
  { value: 'herradero',     label: 'Herradero',     Icon: Hammer },
  { value: 'entrenamiento', label: 'Entrenamiento', Icon: Activity },
  { value: 'mantenimiento', label: 'Mantenimiento', Icon: Wrench },
  { value: 'transporte',    label: 'Transporte',    Icon: Truck },
  { value: 'otros',         label: 'Otros',         Icon: Package },
];

const PLACEHOLDERS: Record<EventType, string> = {
  nota: 'Ej: El caballo come bien, buen estado general',
  entrenamiento: 'Ej: Galope 1200m, tiempo 1:14, buena respuesta',
  salud: 'Ej: Vacunación influenza equina Dr. García',
  carrera: 'Ej: Gran Premio Palermo 1200m - 3° puesto',
  gasto: 'Ej: Bolsa de balanceado y viruta',
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

  // `tipo=gasto` en la ruta abre el formulario ya en gasto (viene de Finanzas).
  const tipoParam = useLocalSearchParams<{ tipo?: string }>().tipo;
  const tipoInicial: EventType =
    EVENT_TYPE_OPTS.some((t) => t.key === tipoParam) ? (tipoParam as EventType) : 'nota';

  const [type, setType] = useState<EventType>(tipoInicial);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [currency, setCurrency] = useState<Currency>('ARS');
  const [error, setError] = useState('');
  const [showTipoSheet, setShowTipoSheet] = useState(false);
  const [showCategoriaSheet, setShowCategoriaSheet] = useState(false);
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  const isDirty = !!description.trim() || !!amount.trim();
  const canSubmit = !!description.trim() && !createEvent.isPending;
  const catSel = EXPENSE_CATEGORIES.find((cat) => cat.value === expenseCategory);

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
        amount: type === 'gasto' && amount ? String(parseFloat(amount) || 0) : undefined,
        expense_category: type === 'gasto' && expenseCategory ? expenseCategory : undefined,
        currency: type === 'gasto' ? currency : undefined,
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
          {type === 'gasto' && (
            <FilaSelector
              label="Categoría"
              valor={catSel?.label}
              placeholder="Elegir"
              onPress={() => setShowCategoriaSheet(true)}
            />
          )}
        </View>

        <DatePicker label="Fecha" value={date} onChange={setDate} maxDate={new Date()} />

        {/* Monto: solo para gastos, igual que en eventos/nuevo */}
        {type === 'gasto' && (
          <View style={s.montoRow}>
            <View style={s.monedaToggle}>
              {CURRENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.monedaBtn, currency === opt.value && s.monedaBtnActiva]}
                  onPress={() => { haptic.selection(); setCurrency(opt.value); }}
                  activeOpacity={0.75}
                >
                  <Text style={[s.monedaText, currency === opt.value && s.monedaTextActiva]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[inputStyle.base, { flex: 1 }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="Monto"
              placeholderTextColor={c.textFaint}
              keyboardType="decimal-pad"
            />
          </View>
        )}

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

      <ActionSheet
        visible={showCategoriaSheet}
        onClose={() => setShowCategoriaSheet(false)}
        title="Categoría del gasto"
        acciones={EXPENSE_CATEGORIES.map((cat) => ({
          label: cat.label,
          Icon: cat.Icon,
          onPress: () => setExpenseCategory(cat.value),
        }))}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[5] },
  errorText: { fontSize: text.sm, color: c.danger },
  montoRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  monedaToggle: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 3 },
  monedaBtn: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.md - 3 },
  monedaBtnActiva: { backgroundColor: c.surface },
  monedaText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  monedaTextActiva: { color: c.text },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: colors.white },
});

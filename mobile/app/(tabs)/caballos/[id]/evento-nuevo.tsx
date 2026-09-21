import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import {
  FileText, Dumbbell, Syringe, Flag, Receipt,
  Wheat, Hammer, Activity, Wrench, Truck, Package, type LucideIcon,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import { useHorse } from '../../../../hooks/use-horses';
import { useCreateEvent } from '../../../../hooks/use-events';
import { todayISO } from '../../../../hooks/use-routines';
import { DatePicker } from '../../../../components/DatePicker';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { useToast } from '../../../../components/Toast';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { CURRENCY_OPTIONS, type Currency } from '../../../../lib/currency';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow, anchoCelda } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { useCommonStyles } from '../../../../styles/common';

const EVENT_TYPE_OPTS = [
  { key: 'nota', label: 'Nota', Icon: FileText },
  { key: 'entrenamiento', label: 'Trabajo', Icon: Dumbbell },
  { key: 'salud', label: 'Salud', Icon: Syringe },
  { key: 'carrera', label: 'Carrera', Icon: Flag },
  { key: 'gasto', label: 'Gasto', Icon: Receipt },
] as const;

type EventType = (typeof EVENT_TYPE_OPTS)[number]['key'];

/** Mismas categorías que `eventos/nuevo.tsx`: el gasto se carga igual desde los dos lados. */
const EXPENSE_CATEGORIES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'alimentacion',  label: 'Alimento',      Icon: Wheat },
  { value: 'veterinario',   label: 'Veterinario',   Icon: Syringe },
  { value: 'herradero',     label: 'Herradero',     Icon: Hammer },
  { value: 'entrenamiento', label: 'Entrenamiento', Icon: Activity },
  { value: 'mantenimiento', label: 'Mantenimiento', Icon: Wrench },
  { value: 'transporte',    label: 'Transporte',    Icon: Truck },
  { value: 'otros',         label: 'Otros',         Icon: Package },
];

const PLACEHOLDERS: Record<EventType, string> = {
  nota: 'Contá qué pasó. Por ejemplo: comió todo, buen ánimo, salió al potrero temprano.',
  entrenamiento: 'Ej: Galope 1200 m, tiempo 1:14, buena respuesta',
  salud: 'Ej: Vacunación influenza equina, Dr. García',
  carrera: 'Ej: Gran Premio Palermo 1200 m, 3° puesto',
  gasto: 'Ej: Herrado completo, cuatro vasos',
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
  // Tres por fila, en píxeles: el 31.5% se pasaba por un pixel y la tercera
  // celda caía a la fila siguiente (ver `anchoCelda`).
  const { width: anchoPantalla } = useWindowDimensions();
  const anchoCelda3 = anchoCelda(anchoPantalla, 3, space[2] + 2, space[4]);
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
  // Al guardar con éxito salimos con back: el guardia de descarte no debe interceptar.
  const guardado = useRef(false);

  const esGasto = type === 'gasto';
  const isDirty = !!description.trim() || !!amount.trim();
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
    if (!description.trim()) { setError('Escribí qué pasó'); haptic.error(); return; }
    setError('');
    try {
      await createEvent.mutateAsync({
        type,
        description: description.trim(),
        date,
        horse_id: id,
        amount: esGasto && amount ? String(parseFloat(amount) || 0) : undefined,
        expense_category: esGasto && expenseCategory ? expenseCategory : undefined,
        currency: esGasto ? currency : undefined,
      });
      haptic.success();
      toast.success(esGasto ? 'Gasto registrado' : 'Evento agregado');
      guardado.current = true;
      router.back();
    } catch {
      haptic.error();
      setError('No se pudo guardar. Intentá de nuevo.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title={esGasto ? 'Nuevo gasto' : 'Cargar algo'} subtitle={horse?.name} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ─── El monto es el dato hero del gasto: se tipea grande y centrado ─── */}
        {esGasto && (
          <View style={s.montoWrap}>
            <View style={s.montoRow}>
              <Text style={s.montoSigno}>$</Text>
              <TextInput
                style={s.montoInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={c.textFaint}
                keyboardType="decimal-pad"
                accessibilityLabel="Monto del gasto"
              />
            </View>
            <View style={s.segmentado}>
              {CURRENCY_OPTIONS.map((opt) => {
                const activo = currency === opt.value;
                return (
                  <PressableScale
                    key={opt.value}
                    scaleTo={0.96}
                    style={[s.segmento, activo && s.segmentoActivo]}
                    onPress={() => { haptic.selection(); setCurrency(opt.value); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                    accessibilityLabel={opt.value === 'ARS' ? 'Pesos' : 'Dólares'}
                  >
                    <Text style={[s.segmentoText, activo && s.segmentoTextActivo]}>
                      {opt.value === 'ARS' ? 'Pesos' : 'Dólares'}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── Qué pasó: el tipo se elige de un vistazo, no en una hoja ─── */}
        <View>
          <Text style={s.rotulo}>Qué pasó</Text>
          <View style={s.grilla}>
            {EVENT_TYPE_OPTS.map((t, i) => {
              const activo = type === t.key;
              const Icono = t.Icon;
              return (
                <Animated.View key={t.key} entering={entradaFila(i)} style={[s.celda3, { width: anchoCelda3 }]}>
                  <PressableScale
                    style={[s.tarjetaOpcion, activo ? s.opcionActiva : s.opcionInactiva]}
                    onPress={() => { haptic.selection(); setType(t.key); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                    accessibilityLabel={t.label}
                  >
                    <Icono size={21} color={activo ? c.bg : c.textMuted} strokeWidth={1.9} />
                    <Text style={[s.opcionLabel, activo && s.opcionLabelActiva]} numberOfLines={1}>{t.label}</Text>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* ─── De qué es el gasto ─── */}
        {esGasto && (
          <View>
            <Text style={s.rotulo}>De qué es</Text>
            <View style={s.grilla}>
              {EXPENSE_CATEGORIES.map((cat, i) => {
                const activo = expenseCategory === cat.value;
                const Icono = cat.Icon;
                return (
                  <Animated.View key={cat.value} entering={entradaFila(i)} style={[s.celda3, { width: anchoCelda3 }]}>
                    <PressableScale
                      style={[s.tarjetaOpcion, activo ? s.opcionActiva : s.opcionInactiva]}
                      onPress={() => { haptic.selection(); setExpenseCategory(activo ? '' : cat.value); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={cat.label}
                    >
                      <Icono size={21} color={activo ? c.bg : c.textMuted} strokeWidth={1.9} />
                      <Text style={[s.opcionLabel, activo && s.opcionLabelActiva]} numberOfLines={1}>{cat.label}</Text>
                    </PressableScale>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}

        <TextInput
          style={[inputStyle.multiline, { minHeight: 112 }]}
          value={description}
          onChangeText={setDescription}
          placeholder={PLACEHOLDERS[type]}
          placeholderTextColor={c.textFaint}
          multiline
          autoCapitalize="sentences"
        />

        <DatePicker label="Cuándo" value={date} onChange={setDate} maxDate={new Date()} />

        {error ? <Text style={s.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Un solo CTA: el verde vive acá y en ningún otro lado. */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.cta, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel={esGasto ? 'Guardar el gasto' : 'Cargar el evento'}
        >
          {createEvent.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.ctaText}>{esGasto ? 'Guardar el gasto' : 'Cargar'}</Text>}
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[8], gap: space[6] },
  rotulo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginBottom: space[3] },

  /* Monto hero */
  montoWrap: { alignItems: 'center', paddingTop: space[3] },
  montoRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] + 2 },
  montoSigno: { fontSize: text['2xl'], fontWeight: weight.semibold, color: c.textFaint, letterSpacing: -1 },
  // El input no lleva caja: el número ES la pantalla en este paso.
  montoInput: {
    fontSize: 56, fontWeight: weight.bold, color: c.text, letterSpacing: -2.4,
    padding: 0, minWidth: 120, textAlign: 'center', fontVariant: ['tabular-nums'],
  },
  segmentado: { flexDirection: 'row', padding: 3, borderRadius: radius.full, backgroundColor: c.surfaceAlt, marginTop: space[4] },
  segmento: { height: 34, paddingHorizontal: space[4] + 2, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  segmentoActivo: { backgroundColor: c.surface, ...(c.isDark ? {} : shadow.sm) },
  segmentoText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  segmentoTextActivo: { color: c.text, fontWeight: weight.semibold },

  /* Grillas de opciones: tres columnas, la elegida pasa a tinta. */
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] + 2 },
  celda3: {},
  tarjetaOpcion: { height: 84, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', gap: space[2], paddingHorizontal: space[2] },
  opcionActiva: { backgroundColor: c.text },
  opcionInactiva: { backgroundColor: c.surface, ...(c.isDark ? {} : shadow.sm) },
  opcionLabel: { fontSize: text.xs + 1, fontWeight: weight.medium, color: c.textMuted },
  opcionLabelActiva: { color: c.bg, fontWeight: weight.semibold },

  errorText: { fontSize: text.sm, color: c.danger },
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  cta: {
    height: touch.button, borderRadius: radius.button, backgroundColor: c.brand,
    alignItems: 'center', justifyContent: 'center',
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});

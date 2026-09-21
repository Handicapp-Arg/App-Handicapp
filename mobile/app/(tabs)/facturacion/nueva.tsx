import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useCreateBill } from '../../../hooks/use-billing';
import { useHorses } from '../../../hooks/use-horses';
import { formatMoney } from '../../../lib/currency';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormSheet } from '../../../components/FormSheet';
import { BottomSheet } from '../../../components/BottomSheet';
import { ActionSheet, type Accion } from '../../../components/ActionSheet';
import { FilaSelector } from '../../../components/FilaSelector';
import { Routes } from '../../../lib/routes';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch, brandShadow } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';
import { useToast } from '../../../components/Toast';
import { PressableScale } from '../../../components/PressableScale';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CURRENCY_LABELS: Record<'ARS' | 'USD', string> = {
  ARS: '$ ARS — Pesos',
  USD: 'US$ USD — Dólares',
};

interface DraftItem { description: string; quantity: number; unit_price: number }

/**
 * Hoja simple de período: flechas de año arriba y grilla plana de meses.
 * El mes elegido se marca con un Check en cuero — sin chips de color.
 */
function PeriodoSheet({ visible, onClose, month, year, onChangeMonth, onChangeYear }: {
  visible: boolean;
  onClose: () => void;
  month: number;
  year: number;
  onChangeMonth: (m: number) => void;
  onChangeYear: (y: number) => void;
}) {
  const { c } = useTheme();
  const s = useMemo(() => makePeriodoStyles(c), [c]);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Período">
      <View style={s.yearRow}>
        <TouchableOpacity
          style={s.yearBtn}
          onPress={() => { haptic.selection(); onChangeYear(year - 1); }}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Año anterior"
        >
          <ChevronLeft size={20} color={c.textMuted} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.yearText}>{year}</Text>
        <TouchableOpacity
          style={s.yearBtn}
          onPress={() => { haptic.selection(); onChangeYear(year + 1); }}
          activeOpacity={0.7}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Año siguiente"
        >
          <ChevronRight size={20} color={c.textMuted} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <View style={s.mesGrid}>
        {MESES.map((m, idx) => {
          const activo = idx + 1 === month;
          return (
            <TouchableOpacity
              key={m}
              style={s.mesCelda}
              onPress={() => { haptic.selection(); onChangeMonth(idx + 1); onClose(); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={m}
            >
              {activo && <Check size={16} color={c.brand} strokeWidth={2.5} />}
              <Text style={[s.mesText, activo && s.mesTextActivo]}>{m.slice(0, 3)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const makePeriodoStyles = (c: ThemeColors) => StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[4], paddingVertical: space[1] },
  yearBtn: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
  yearText: { fontSize: text.md, fontWeight: weight.semibold, color: c.text, minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  mesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: space[2] },
  mesCelda: { width: '25%', minHeight: touch.min, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1] },
  mesText: { fontSize: text.md, color: c.textMuted },
  mesTextActivo: { color: c.text, fontWeight: weight.semibold },
});

/** Hoja chica de 3 campos — acción rápida legítima de FormSheet, aunque el formulario padre sea pantalla completa. */
function AddItemSheet({ visible, onClose, onAdd, c }: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: DraftItem) => void;
  c: ThemeColors;
}) {
  const { button, input } = useCommonStyles();
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');

  const reset = () => { setDescription(''); setQuantity('1'); setUnitPrice(''); };

  const canAdd = description.trim().length > 0 && parseFloat(unitPrice || '0') > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    haptic.light();
    onAdd({ description: description.trim(), quantity: parseFloat(quantity || '1'), unit_price: parseFloat(unitPrice) });
    reset();
    onClose();
  };

  return (
    <FormSheet
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      title="Agregar ítem"
      footer={
        <TouchableOpacity
          style={[button.primary, { flex: 1 }, !canAdd && { opacity: 0.5 }]}
          disabled={!canAdd}
          onPress={handleAdd}
        >
          <Text style={button.primaryText}>Agregar</Text>
        </TouchableOpacity>
      }
    >
      <TextInput
        style={input.base}
        value={description}
        onChangeText={setDescription}
        placeholder="Concepto, ej: Pensión mensual"
        placeholderTextColor={c.textFaint}
        returnKeyType="next"
        autoFocus
      />
      <View style={{ flexDirection: 'row', gap: space[3] }}>
        <TextInput
          style={[input.base, { flex: 1 }]}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Cantidad"
          placeholderTextColor={c.textFaint}
          keyboardType="decimal-pad"
          returnKeyType="next"
        />
        <TextInput
          style={[input.base, { flex: 1 }]}
          value={unitPrice}
          onChangeText={setUnitPrice}
          placeholder="Precio unitario"
          placeholderTextColor={c.textFaint}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
      </View>
    </FormSheet>
  );
}

export default function NuevaFacturaScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses } = useHorses();
  const createBill = useCreateBill();
  const toast = useToast();

  const boardedHorses = useMemo(() => (horses ?? []).filter((h) => h.establishment_id), [horses]);

  const [horseId, setHorseId] = useState('');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [sheet, setSheet] = useState<'caballo' | 'periodo' | 'moneda' | null>(null);

  const selectedHorse = boardedHorses.find((h) => h.id === horseId);
  const ownerId = selectedHorse?.owner_id ?? '';

  const removeItem = (i: number) => { haptic.light(); setItems((prev) => prev.filter((_, idx) => idx !== i)); };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const canSubmit = !!horseId && !!ownerId && items.length > 0 && !createBill.isPending;
  const isDirty = !!horseId || items.length > 0 || !!notes.trim();

  // Intercepta salir (back del header, gesto o botón físico) y confirma solo
  // si hay formulario sucio.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove' as never, (e: any) => {
      if (!isDirty) return;
      e.preventDefault();
      Alert.alert('¿Descartar cambios?', 'Vas a perder lo que cargaste.', [
        { text: 'Seguir editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, isDirty]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    haptic.medium();
    try {
      const bill = await createBill.mutateAsync({
        horse_id: horseId,
        owner_id: ownerId,
        month,
        year,
        currency,
        items,
        notes: notes.trim() || undefined,
      });
      haptic.success();
      router.replace(Routes.factura(bill.id) as never);
    } catch {
      haptic.error();
      toast.error('No se pudo crear la factura. Intentá de nuevo.');
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <ScreenHeader scrollable title="Nueva factura" showBack />

        {/* Selección: filas planas patrón Ajustes de iOS (como eventos/nuevo) */}
        <View>
          <FilaSelector
            primera
            label="Caballo"
            valor={selectedHorse?.name}
            placeholder={boardedHorses.length === 0 ? 'No tenés caballos en pensión' : 'Elegir'}
            onPress={() => { if (boardedHorses.length > 0) setSheet('caballo'); }}
          />
          <FilaSelector
            label="Período"
            valor={`${MESES[month - 1]} ${year}`}
            onPress={() => setSheet('periodo')}
          />
          <FilaSelector
            label="Moneda"
            valor={CURRENCY_LABELS[currency]}
            onPress={() => setSheet('moneda')}
          />
        </View>

        {/* Propietario (auto) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Propietario</Text>
          <View style={s.ownerBox}>
            <Text style={selectedHorse?.owner?.name ? s.ownerName : s.ownerPlaceholder}>
              {selectedHorse?.owner?.name ?? 'Se completa al elegir el caballo'}
            </Text>
          </View>
        </View>

        {/* Ítems */}
        <View style={s.section}>
          <View style={s.itemsHeader}>
            <Text style={s.sectionTitle}>Ítems</Text>
            <TouchableOpacity onPress={() => { haptic.light(); setAddingItem(true); }} activeOpacity={0.7} style={s.addItemBtn}>
              <Plus size={14} color={c.brand} strokeWidth={2.5} />
              <Text style={s.addItemText}>Agregar ítem</Text>
            </TouchableOpacity>
          </View>
          {items.length === 0 ? (
            <Text style={s.mutedNote}>Todavía no agregaste ítems.</Text>
          ) : (
            items.map((item, i) => (
              <View key={i} style={[s.itemRow, i < items.length - 1 && s.itemRowDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemDesc} numberOfLines={1}>{item.description}</Text>
                  <Text style={s.itemMeta}>{item.quantity} × {formatMoney(item.unit_price, currency)}</Text>
                </View>
                <Text style={s.itemTotal}>{formatMoney(item.quantity * item.unit_price, currency)}</Text>
                <TouchableOpacity
                  style={s.removeItemBtn}
                  onPress={() => removeItem(i)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar ítem ${item.description}`}
                  hitSlop={8}
                >
                  <Trash2 size={16} color={c.textFaint} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Notas */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Notas (opcional)</Text>
          <TextInput
            style={s.textarea}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholder="Notas para el propietario..."
            placeholderTextColor={c.textFaint}
          />
        </View>

        {/* Total hero */}
        <View style={s.totalHero}>
          <Text style={s.totalHeroLabel}>Total</Text>
          <Text style={s.totalHeroValue}>{formatMoney(total, currency)}</Text>
        </View>
      </ScrollView>

      {/* Footer fijo */}
      <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <PressableScale
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={() => { void handleSubmit(); }}
          accessibilityRole="button"
          accessibilityLabel="Crear el borrador de la factura"
        >
          {createBill.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Crear borrador</Text>
          }
        </PressableScale>
      </View>

      <AddItemSheet
        visible={addingItem}
        onClose={() => setAddingItem(false)}
        onAdd={(item) => setItems((prev) => [...prev, item])}
        c={c}
      />

      <ActionSheet
        visible={sheet === 'caballo'}
        onClose={() => setSheet(null)}
        title="Caballo"
        acciones={boardedHorses.map((h): Accion => ({ label: h.name, onPress: () => setHorseId(h.id) }))}
      />
      <ActionSheet
        visible={sheet === 'moneda'}
        onClose={() => setSheet(null)}
        title="Moneda"
        acciones={(['ARS', 'USD'] as const).map((cur): Accion => ({
          label: CURRENCY_LABELS[cur],
          onPress: () => setCurrency(cur),
        }))}
      />
      <PeriodoSheet
        visible={sheet === 'periodo'}
        onClose={() => setSheet(null)}
        month={month}
        year={year}
        onChangeMonth={setMonth}
        onChangeYear={setYear}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[8], gap: space[6] },
  section: { gap: space[2] },
  sectionTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },
  mutedNote: { fontSize: text.base, color: c.textFaint },

  ownerBox: { borderRadius: radius.field, paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: c.surfaceAlt },
  ownerName: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  ownerPlaceholder: { fontSize: text.base, color: c.textFaint },

  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: text.sm, fontWeight: weight.bold, color: c.brand },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3] },
  itemRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  itemDesc: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  itemMeta: { fontSize: text.xs, color: c.textFaint, marginTop: 2, fontVariant: ['tabular-nums'] },
  itemTotal: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  removeItemBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },

  textarea: { borderRadius: radius.field, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.md, color: c.text, backgroundColor: c.surfaceAlt, height: 100, textAlignVertical: 'top' },

  totalHero: { alignItems: 'center', paddingVertical: space[6], gap: space[1] },
  totalHeroLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint },
  totalHeroValue: { fontSize: text.display, fontWeight: weight.bold, color: c.text, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },

  // Footer sin borde ni sombra: solo aire, como eventos/nuevo.
  footer: { paddingHorizontal: space[4], paddingTop: space[3] },
  submitBtn: { backgroundColor: c.brand, borderRadius: radius.button, height: touch.button, justifyContent: 'center', alignItems: 'center', ...(c.isDark ? {} : brandShadow(c.brand)) },
  submitBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});

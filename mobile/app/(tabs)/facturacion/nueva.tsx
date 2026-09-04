import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2 } from 'lucide-react-native';
import { useCreateBill } from '../../../hooks/use-billing';
import { useHorses } from '../../../hooks/use-horses';
import { formatMoney } from '../../../lib/currency';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormSheet } from '../../../components/FormSheet';
import { Routes } from '../../../lib/routes';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch, shadow } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';
import { useToast } from '../../../components/Toast';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

interface DraftItem { description: string; quantity: number; unit_price: number }

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
    <View style={s.root}>
      <ScreenHeader title="Nueva factura" showBack />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* Caballo */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Caballo</Text>
          {boardedHorses.length === 0 ? (
            <Text style={s.mutedNote}>No tenés caballos en pensión para facturar.</Text>
          ) : (
            <View style={s.pickRow}>
              {boardedHorses.map((h) => {
                const active = h.id === horseId;
                return (
                  <TouchableOpacity key={h.id} style={[s.chip, active && s.chipActive]} onPress={() => { haptic.selection(); setHorseId(h.id); }} activeOpacity={0.8}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{h.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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

        {/* Período */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Período</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
            {MONTHS.map((m, idx) => {
              const active = idx + 1 === month;
              return (
                <TouchableOpacity key={m} style={[s.chip, active && s.chipActive]} onPress={() => { haptic.selection(); setMonth(idx + 1); }} activeOpacity={0.8}>
                  <Text style={[s.chipText, active && s.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={s.stepperRow}>
            <TouchableOpacity
              style={s.stepperBtn}
              onPress={() => { haptic.selection(); setYear((y) => y - 1); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Año anterior"
              hitSlop={8}
            >
              <Text style={s.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={s.stepperValue}>{year}</Text>
            <TouchableOpacity
              style={s.stepperBtn}
              onPress={() => { haptic.selection(); setYear((y) => y + 1); }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Año siguiente"
              hitSlop={8}
            >
              <Text style={s.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Moneda */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Moneda</Text>
          <View style={s.currencyRow}>
            {(['ARS', 'USD'] as const).map((cur) => {
              const active = currency === cur;
              return (
                <TouchableOpacity key={cur} style={[s.currencyBtn, active && s.currencyBtnActive]} onPress={() => { haptic.selection(); setCurrency(cur); }} activeOpacity={0.8}>
                  <Text style={[s.currencyBtnText, active && s.currencyBtnTextActive]}>
                    {cur === 'ARS' ? '$ ARS — Pesos' : 'US$ USD — Dólares'}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && { opacity: 0.5 }]}
          disabled={!canSubmit}
          onPress={handleSubmit}
          activeOpacity={0.85}
        >
          {createBill.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={s.submitBtnText}>Crear borrador</Text>
          }
        </TouchableOpacity>
      </View>

      <AddItemSheet
        visible={addingItem}
        onClose={() => setAddingItem(false)}
        onAdd={(item) => setItems((prev) => [...prev, item])}
        c={c}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { padding: space[4], gap: space[6] },
  section: { gap: space[2] },
  sectionTitle: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted },
  mutedNote: { fontSize: text.sm, color: c.textFaint, fontStyle: 'italic' },

  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: c.surfaceAlt },
  chipActive: { backgroundColor: c.brand },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  chipTextActive: { color: colors.white },

  ownerBox: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: c.surfaceAlt },
  ownerName: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  ownerPlaceholder: { fontSize: text.sm, color: c.textFaint },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  stepperBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  stepperValue: { fontSize: text.base, fontWeight: weight.bold, color: c.text, minWidth: 56, textAlign: 'center', fontVariant: ['tabular-nums'] },

  currencyRow: { flexDirection: 'row', gap: space[2] },
  currencyBtn: { flex: 1, borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center', backgroundColor: c.surfaceAlt },
  currencyBtnActive: { backgroundColor: c.brand },
  currencyBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  currencyBtnTextActive: { color: colors.white },

  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: text.xs, fontWeight: weight.bold, color: c.brand },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3] },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  itemDesc: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  itemMeta: { fontSize: text.xs, color: c.textFaint, marginTop: 2, fontVariant: ['tabular-nums'] },
  itemTotal: { fontSize: text.sm, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  removeItemBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },

  textarea: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.md, color: c.text, backgroundColor: c.surfaceAlt, height: 100, textAlignVertical: 'top' },

  totalHero: { alignItems: 'center', paddingVertical: space[6], gap: space[1] },
  totalHeroLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalHeroValue: { fontSize: text.display, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },

  footer: {
    backgroundColor: c.surface,
    paddingHorizontal: space[4],
    paddingTop: space[3],
    ...(c.isDark ? {} : shadow.sm),
  },
  submitBtn: { backgroundColor: c.brand, borderRadius: radius.lg, height: touch.button, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.bold, color: colors.white },
});

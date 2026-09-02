import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  TextInput, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2 } from 'lucide-react-native';
import { useBills, useCreateBill, useSendBill, useApproveBill, useDisputeBill, STATUS_META, monthLabel } from '../../hooks/use-billing';
import { useHorses } from '../../hooks/use-horses';
import { formatMoney } from '../../lib/currency';
import { useAuth } from '../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../components/ScreenHeader';
import { Routes } from '../../lib/routes';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { FormSheet } from '../../components/FormSheet';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch } from '../../styles/tokens';
import { useCommonStyles } from '../../styles/common';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// STATUS_META (hooks/use-billing.ts) trae hex fijos, no dark-safe. Remapeamos
// acá a los semánticos del theme, igual que en contratos.tsx.
const makeStatusColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  borrador:  { bg: c.surfaceAlt, text: c.textMuted },
  enviada:   { bg: c.infoSoft, text: c.info },
  aprobada:  { bg: c.successSoft, text: c.success },
  disputada: { bg: c.dangerSoft, text: c.danger },
});

function CreateBillModal({ visible, onClose, c, s }: { visible: boolean; onClose: () => void; c: ThemeColors; s: Styles }) {
  const { button, input } = useCommonStyles();
  const { data: horses } = useHorses();
  const createBill = useCreateBill();

  const boardedHorses = useMemo(() => (horses ?? []).filter((h) => h.establishment_id), [horses]);

  const [horseId, setHorseId] = useState('');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [items, setItems] = useState<{ description: string; quantity: string; unit_price: string }[]>([
    { description: '', quantity: '1', unit_price: '' },
  ]);
  const [notes, setNotes] = useState('');

  // La hoja ya no se destruye al cerrarse, así que el formulario se limpia al abrir.
  useEffect(() => {
    if (!visible) return;
    const now = new Date();
    setHorseId('');
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setCurrency('ARS');
    setItems([{ description: '', quantity: '1', unit_price: '' }]);
    setNotes('');
  }, [visible]);

  const selectedHorse = boardedHorses.find((h) => h.id === horseId);
  const ownerId = selectedHorse?.owner_id ?? '';

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: '1', unit_price: '' }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: 'description' | 'quantity' | 'unit_price', value: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));

  const total = items.reduce((sum, i) => sum + (parseFloat(i.quantity || '0') * parseFloat(i.unit_price || '0')), 0);
  const validItems = items.filter((i) => i.description.trim() && i.unit_price.trim());
  const canSubmit = !!horseId && !!ownerId && validItems.length > 0 && !createBill.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    haptic.medium();
    try {
      await createBill.mutateAsync({
        horse_id: horseId,
        owner_id: ownerId,
        month,
        year,
        currency,
        items: validItems.map((i) => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity || '1'),
          unit_price: parseFloat(i.unit_price),
        })),
        notes: notes.trim() || undefined,
      });
      haptic.success();
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudo crear la factura. Intentá de nuevo.');
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Nueva factura"
      footer={
        <>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={onClose}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[button.primary, { flex: 1 }, !canSubmit && { opacity: 0.5 }]}
            disabled={!canSubmit}
            onPress={handleSubmit}
          >
            {createBill.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={button.primaryText}>Crear borrador</Text>
            }
          </TouchableOpacity>
        </>
      }
    >
      <>
          {/* Caballo */}
          <View style={{ gap: space[2] }}>
            <Text style={s.fieldLabel}>Caballo</Text>
            {boardedHorses.length === 0 ? (
              <Text style={s.mutedNote}>No tenés caballos en pensión para facturar.</Text>
            ) : (
              <View style={s.pickRow}>
                {boardedHorses.map((h) => {
                  const active = h.id === horseId;
                  return (
                    <TouchableOpacity key={h.id} style={[s.chip, active && s.chipActive]} onPress={() => setHorseId(h.id)} activeOpacity={0.8}>
                      <Text style={[s.chipText, active && s.chipTextActive]}>{h.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Propietario (auto) */}
          <View style={{ gap: space[2] }}>
            <Text style={s.fieldLabel}>Propietario</Text>
            <View style={s.ownerBox}>
              <Text style={selectedHorse?.owner?.name ? s.ownerName : s.ownerPlaceholder}>
                {selectedHorse?.owner?.name ?? 'Se completa al elegir el caballo'}
              </Text>
            </View>
          </View>

          {/* Mes / Año */}
          <View style={{ gap: space[2] }}>
            <Text style={s.fieldLabel}>Período</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
              {MONTHS.map((m, idx) => {
                const active = idx + 1 === month;
                return (
                  <TouchableOpacity key={m} style={[s.chip, active && s.chipActive]} onPress={() => setMonth(idx + 1)} activeOpacity={0.8}>
                    <Text style={[s.chipText, active && s.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={s.stepperRow}>
              <TouchableOpacity
                style={s.stepperBtn}
                onPress={() => setYear((y) => y - 1)}
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
                onPress={() => setYear((y) => y + 1)}
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
          <View style={{ gap: space[2] }}>
            <Text style={s.fieldLabel}>Moneda</Text>
            <View style={s.currencyRow}>
              {(['ARS', 'USD'] as const).map((cur) => {
                const active = currency === cur;
                return (
                  <TouchableOpacity key={cur} style={[s.currencyBtn, active && s.currencyBtnActive]} onPress={() => setCurrency(cur)} activeOpacity={0.8}>
                    <Text style={[s.currencyBtnText, active && s.currencyBtnTextActive]}>
                      {cur === 'ARS' ? '$ ARS — Pesos' : 'US$ USD — Dólares'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Ítems */}
          <View style={{ gap: space[2] }}>
            <View style={s.itemsHeader}>
              <Text style={s.fieldLabel}>Ítems</Text>
              <TouchableOpacity onPress={addItem} activeOpacity={0.7} style={s.addItemBtn}>
                <Plus size={14} color={c.brand} strokeWidth={2.5} />
                <Text style={s.addItemText}>Agregar</Text>
              </TouchableOpacity>
            </View>
            {items.map((item, i) => (
              <View key={i} style={s.itemRowEdit}>
                <TextInput
                  style={[input.base, s.itemDescInput]}
                  value={item.description}
                  onChangeText={(v) => updateItem(i, 'description', v)}
                  placeholder="Descripción"
                  placeholderTextColor={c.textFaint}
                />
                <TextInput
                  style={[input.base, s.itemQtyInput]}
                  value={item.quantity}
                  onChangeText={(v) => updateItem(i, 'quantity', v)}
                  placeholder="Cant."
                  placeholderTextColor={c.textFaint}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[input.base, s.itemPriceInput]}
                  value={item.unit_price}
                  onChangeText={(v) => updateItem(i, 'unit_price', v)}
                  placeholder="Precio"
                  placeholderTextColor={c.textFaint}
                  keyboardType="numeric"
                />
                {items.length > 1 && (
                  <TouchableOpacity
                    style={s.removeItemBtn}
                    onPress={() => removeItem(i)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar ítem"
                    hitSlop={8}
                  >
                    <Trash2 size={16} color={c.textFaint} strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalValue}>{formatMoney(total, currency)}</Text>
            </View>
          </View>

          {/* Notas */}
          <View style={{ gap: space[2] }}>
            <Text style={s.fieldLabel}>Notas (opcional)</Text>
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
      </>
    </FormSheet>
  );
}

function DisputeModal({ visible, billId, onClose, c, s }: { visible: boolean; billId: string | null; onClose: () => void; c: ThemeColors; s: Styles }) {
  const { typography, button } = useCommonStyles();
  const dispute = useDisputeBill();
  const [reason, setReason] = useState('');

  // La hoja ya no se destruye al cerrarse, así que el motivo se limpia al abrir.
  useEffect(() => {
    if (!visible) return;
    setReason('');
  }, [visible]);

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Disputar factura"
      footer={
        <>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={onClose}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.disputeBtn, (!reason.trim() || dispute.isPending) && { opacity: 0.6 }]}
            disabled={!reason.trim() || dispute.isPending}
            onPress={async () => {
              if (!billId) return;
              await dispute.mutateAsync({ id: billId, reason });
              haptic.success();
              onClose();
            }}
          >
            {dispute.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={button.primaryText}>Confirmar disputa</Text>
            }
          </TouchableOpacity>
        </>
      }
    >
      <Text style={typography.body}>Explicá el motivo de la disputa para que el establecimiento pueda revisarlo.</Text>
      <TextInput
        style={s.textarea}
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
        placeholder="Motivo de la disputa..."
        placeholderTextColor={c.textFaint}
      />
    </FormSheet>
  );
}

export default function FacturacionScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { layout } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const billStatusColors = useMemo(() => makeStatusColors(c), [c]);
  const { data: bills, isLoading, isError, refetch, isRefetching } = useBills();
  const sendBill = useSendBill();
  const approveBill = useApproveBill();
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';

  const headerRight = isEst
    ? <HeaderButton label="Nueva factura" icon={Plus} onPress={() => { haptic.light(); setCreating(true); }} />
    : undefined;

  const handleSend = (id: string) => {
    haptic.medium();
    Alert.alert('Enviar factura', '¿Enviás esta factura al propietario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => { haptic.success(); sendBill.mutate(id); } },
    ]);
  };

  const handleApprove = (id: string) => {
    haptic.medium();
    Alert.alert('Aprobar factura', '¿Confirmás que aprobás esta factura?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprobar', onPress: () => { haptic.success(); approveBill.mutate(id); } },
    ]);
  };

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>
      {isLoading ? (
        <View>
          <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />
          <View style={{ padding: space[4], gap: space[3] }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={s.billCard}>
                <View style={s.billHeader}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton width={70} height={18} borderRadius={radius.full} />
                    <Skeleton width="55%" height={13} />
                    <Skeleton width="35%" height={11} />
                  </View>
                  <Skeleton width={84} height={20} />
                </View>
                <Skeleton width="100%" height={44} borderRadius={radius.md} />
              </View>
            ))}
          </View>
        </View>
      ) : isError && !bills?.length ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />
          <ErrorState onRetry={refetch} />
        </ScrollView>
      ) : !bills?.length ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />
          <EmptyState
            icon="receipt-outline"
            title={isEst ? 'Sin facturas creadas' : 'Sin facturas recibidas'}
            message={isEst ? 'Creá facturas de pensión para enviar a los propietarios.' : 'Las facturas del establecimiento aparecerán aquí para que puedas aprobarlas.'}
            tint={c.brand}
            actionLabel={isEst ? 'Nueva factura' : undefined}
            onAction={isEst ? () => { haptic.light(); setCreating(true); } : undefined}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 120, gap: space[3] }}
          ListHeaderComponent={<ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />}
          renderItem={({ item: bill, index }) => {
            const meta = STATUS_META[bill.status];
            const sc = billStatusColors[bill.status] ?? billStatusColors.borrador;
            return (
              <Animated.View style={[s.billCard, { marginHorizontal: space[4] }]} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                {/* Header */}
                <View style={s.billHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <View style={[s.statusDot, { backgroundColor: sc.text }]} />
                      <Text style={[s.statusText, { color: sc.text }]}>{meta.label}</Text>
                    </View>
                    {bill.horse && <Text style={s.horseName}>{bill.horse.name}</Text>}
                    <Text style={s.period}>{monthLabel(bill.month, bill.year)}</Text>
                  </View>
                  <Text style={s.total}>{formatMoney(bill.total, bill.currency)}</Text>
                </View>

                {/* Items */}
                <View style={s.itemsBox}>
                  {bill.items.map((item, i) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={s.itemDesc} numberOfLines={1}>{item.description}</Text>
                      <Text style={s.itemTotal}>{formatMoney(item.total, bill.currency)}</Text>
                    </View>
                  ))}
                </View>

                {bill.dispute_reason && (
                  <Text style={s.disputeReason}>Disputa: {bill.dispute_reason}</Text>
                )}
                {bill.notes && <Text style={s.notes}>{bill.notes}</Text>}

                {/* Acciones */}
                {isEst && bill.status === 'borrador' && (
                  <TouchableOpacity
                    style={s.actionBtnBlue}
                    onPress={() => handleSend(bill.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Enviar factura al propietario"
                  >
                    <Text style={[s.actionBtnText, { color: c.info }]}>Enviar al propietario</Text>
                  </TouchableOpacity>
                )}
                {isProp && bill.status === 'enviada' && (
                  <View style={s.actionRow}>
                    <TouchableOpacity
                      style={[s.actionBtnGreen, { flex: 1 }]}
                      onPress={() => handleApprove(bill.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Aprobar factura"
                    >
                      <Text style={[s.actionBtnText, { color: c.success }]}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtnRed, { flex: 1 }]}
                      onPress={() => setDisputingId(bill.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Disputar factura"
                    >
                      <Text style={[s.actionBtnText, { color: c.danger }]}>Disputar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            );
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <DisputeModal visible={!!disputingId} billId={disputingId} onClose={() => setDisputingId(null)} c={c} s={s} />

      <CreateBillModal visible={creating} onClose={() => setCreating(false)} c={c} s={s} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[2] },
  billCard: { backgroundColor: c.surface, borderRadius: radius.xl, padding: space[4], gap: space[3], ...(c.isDark ? {} : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }) },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: text.xs, fontWeight: weight.semibold },
  horseName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  period: { fontSize: text.xs, color: c.textMuted },
  total: { fontSize: text.xl, fontWeight: weight.extrabold, color: c.text, fontVariant: ['tabular-nums'] },
  itemsBox: { backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[3], gap: space[2] },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemDesc: { fontSize: text.sm, color: c.textMuted, flex: 1, marginRight: space[2] },
  itemTotal: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text, fontVariant: ['tabular-nums'] },
  disputeReason: { fontSize: text.sm, color: c.danger, fontStyle: 'italic' },
  notes: { fontSize: text.sm, color: c.textFaint },
  actionRow: { flexDirection: 'row', gap: space[2] },
  actionBtnBlue: { backgroundColor: c.infoSoft, borderRadius: radius.md, height: touch.button, justifyContent: 'center', alignItems: 'center' },
  actionBtnGreen: { backgroundColor: c.successSoft, borderRadius: radius.md, height: touch.button, justifyContent: 'center', alignItems: 'center' },
  actionBtnRed: { backgroundColor: c.dangerSoft, borderRadius: radius.md, height: touch.button, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: text.md, fontWeight: weight.bold },
  textarea: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.md, color: c.text, backgroundColor: c.surfaceAlt, height: 100, textAlignVertical: 'top' },
  disputeBtn: { flex: 1, backgroundColor: c.danger, borderRadius: radius.md, height: touch.button, justifyContent: 'center', alignItems: 'center' },

  // ─── CreateBillModal ───
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
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
  itemRowEdit: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  itemDescInput: { flex: 1, paddingVertical: space[2] },
  itemQtyInput: { width: 56, paddingVertical: space[2], textAlign: 'center', fontVariant: ['tabular-nums'] },
  itemPriceInput: { width: 80, paddingVertical: space[2], textAlign: 'center', fontVariant: ['tabular-nums'] },
  removeItemBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[1] },
  totalLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  totalValue: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text, fontVariant: ['tabular-nums'] },
});

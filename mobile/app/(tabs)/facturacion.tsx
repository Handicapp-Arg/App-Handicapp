import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2 } from 'lucide-react-native';
import { useBills, useCreateBill, useSendBill, useApproveBill, useDisputeBill, STATUS_META, monthLabel } from '../../hooks/use-billing';
import { useHorses } from '../../hooks/use-horses';
import { formatCurrency, formatMoney } from '../../lib/currency';
import { useAuth } from '../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../components/ScreenHeader';
import { Routes } from '../../lib/routes';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight } from '../../styles/tokens';
import { useCommonStyles } from '../../styles/common';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function CreateBillModal({ onClose, c, s }: { onClose: () => void; c: ThemeColors; s: Styles }) {
  const { modal: modalStyle, button, input } = useCommonStyles();
  const { data: horses } = useHorses();
  const createBill = useCreateBill();
  const now = new Date();

  const boardedHorses = useMemo(() => (horses ?? []).filter((h) => h.establishment_id), [horses]);

  const [horseId, setHorseId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [items, setItems] = useState<{ description: string; quantity: string; unit_price: string }[]>([
    { description: '', quantity: '1', unit_price: '' },
  ]);
  const [notes, setNotes] = useState('');

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
    <KeyboardAvoidingView style={modalStyle.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View style={modalStyle.sheet} entering={SlideInDown.springify().damping(26).stiffness(190)}>
        <View style={modalStyle.header}>
          <Text style={modalStyle.title}>Nueva factura</Text>
          <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
        </View>

        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={[modalStyle.body, { gap: space[4] }]} keyboardShouldPersistTaps="handled">
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
              <TouchableOpacity style={s.stepperBtn} onPress={() => setYear((y) => y - 1)} activeOpacity={0.7}>
                <Text style={s.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.stepperValue}>{year}</Text>
              <TouchableOpacity style={s.stepperBtn} onPress={() => setYear((y) => y + 1)} activeOpacity={0.7}>
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
                  <TouchableOpacity style={s.removeItemBtn} onPress={() => removeItem(i)} activeOpacity={0.7}>
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
        </ScrollView>

        <View style={modalStyle.footer}>
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
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function DisputeModal({ billId, onClose, c, s }: { billId: string; onClose: () => void; c: ThemeColors; s: Styles }) {
  const { typography, modal: modalStyle, button } = useCommonStyles();
  const dispute = useDisputeBill();
  const [reason, setReason] = useState('');

  return (
    <KeyboardAvoidingView style={modalStyle.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={modalStyle.sheet} entering={SlideInDown.springify().damping(26).stiffness(190)}>
        <View style={modalStyle.header}>
          <Text style={modalStyle.title}>Disputar factura</Text>
          <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
        </View>
        <View style={[modalStyle.body, { gap: space[4] }]}>
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
        </View>
        <View style={modalStyle.footer}>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={onClose}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.disputeBtn, (!reason.trim() || dispute.isPending) && { opacity: 0.6 }]}
            disabled={!reason.trim() || dispute.isPending}
            onPress={async () => {
              await dispute.mutateAsync({ id: billId, reason });
              onClose();
            }}
          >
            {dispute.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={button.primaryText}>Confirmar disputa</Text>
            }
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

export default function FacturacionScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { layout } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: bills, isLoading, refetch, isRefetching } = useBills();
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
      ) : !bills?.length ? (
        <View>
          <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />
          <EmptyState
            icon="receipt-outline"
            title={isEst ? 'Sin facturas creadas' : 'Sin facturas recibidas'}
            message={isEst ? 'Creá facturas de pensión para enviar a los propietarios.' : 'Las facturas del establecimiento aparecerán aquí para que puedas aprobarlas.'}
            tint={c.brand}
            actionLabel={isEst ? 'Nueva factura' : undefined}
            onAction={isEst ? () => { haptic.light(); setCreating(true); } : undefined}
          />
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: space[8], gap: space[3] }}
          ListHeaderComponent={<ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />}
          renderItem={({ item: bill, index }) => {
            const meta = STATUS_META[bill.status];
            return (
              <Animated.View style={[s.billCard, { marginHorizontal: space[4] }]} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                {/* Header */}
                <View style={s.billHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={[s.statusBadge, { backgroundColor: c.isDark ? meta.color + '26' : meta.bg }]}>
                      <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {bill.horse && <Text style={s.horseName}>{bill.horse.name}</Text>}
                    <Text style={s.period}>{monthLabel(bill.month, bill.year)}</Text>
                  </View>
                  <Text style={s.total}>{formatCurrency(bill.total, bill.currency)}</Text>
                </View>

                {/* Items */}
                <View style={s.itemsBox}>
                  {bill.items.map((item, i) => (
                    <View key={i} style={s.itemRow}>
                      <Text style={s.itemDesc} numberOfLines={1}>{item.description}</Text>
                      <Text style={s.itemTotal}>{formatCurrency(item.total, bill.currency)}</Text>
                    </View>
                  ))}
                </View>

                {bill.dispute_reason && (
                  <Text style={s.disputeReason}>Disputa: {bill.dispute_reason}</Text>
                )}
                {bill.notes && <Text style={s.notes}>{bill.notes}</Text>}

                {/* Acciones */}
                {isEst && bill.status === 'borrador' && (
                  <TouchableOpacity style={s.actionBtnBlue} onPress={() => handleSend(bill.id)}>
                    <Text style={s.actionBtnText}>Enviar al propietario</Text>
                  </TouchableOpacity>
                )}
                {isProp && bill.status === 'enviada' && (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.actionBtnGreen, { flex: 1 }]} onPress={() => handleApprove(bill.id)}>
                      <Text style={s.actionBtnText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtnRed, { flex: 1 }]} onPress={() => setDisputingId(bill.id)}>
                      <Text style={s.actionBtnText}>Disputar</Text>
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

      <Modal visible={!!disputingId} animationType="fade" transparent statusBarTranslucent>
        {disputingId && <DisputeModal billId={disputingId} onClose={() => setDisputingId(null)} c={c} s={s} />}
      </Modal>

      <Modal visible={creating} animationType="fade" transparent statusBarTranslucent>
        {creating && <CreateBillModal onClose={() => setCreating(false)} c={c} s={s} />}
      </Modal>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[2] },
  billCard: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, padding: space[4], gap: space[3] },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: text.xs, fontWeight: weight.semibold },
  horseName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  period: { fontSize: text.xs, color: c.textMuted },
  total: { fontSize: text.xl, fontWeight: weight.extrabold, color: c.text },
  itemsBox: { backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: space[3], gap: space[1] + 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemDesc: { fontSize: text.xs, color: c.textMuted, flex: 1, marginRight: space[2] },
  itemTotal: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },
  disputeReason: { fontSize: text.xs, color: colors.red700, fontStyle: 'italic' },
  notes: { fontSize: text.xs, color: c.textFaint },
  actionRow: { flexDirection: 'row', gap: space[2] },
  actionBtnBlue: { backgroundColor: c.isDark ? 'rgba(59,130,246,0.14)' : '#eff6ff', borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  actionBtnGreen: { backgroundColor: c.isDark ? 'rgba(34,197,94,0.14)' : '#f0fdf4', borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  actionBtnRed: { backgroundColor: c.isDark ? 'rgba(239,68,68,0.14)' : '#fef2f2', borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  actionBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: c.isDark ? c.text : colors.gray700 },
  textarea: { borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.sm, color: c.text, backgroundColor: c.surfaceAlt, height: 100, textAlignVertical: 'top' },
  disputeBtn: { flex: 1, backgroundColor: colors.red700, borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },

  // ─── CreateBillModal ───
  fieldLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  mutedNote: { fontSize: text.sm, color: c.textFaint, fontStyle: 'italic' },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { borderRadius: radius.full, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: space[3], paddingVertical: space[2], backgroundColor: c.surface },
  chipActive: { backgroundColor: c.brand, borderColor: c.brand },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  chipTextActive: { color: colors.white },
  ownerBox: { borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: c.surfaceAlt },
  ownerName: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  ownerPlaceholder: { fontSize: text.sm, color: c.textFaint },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  stepperBtn: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface, justifyContent: 'center', alignItems: 'center' },
  stepperBtnText: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  stepperValue: { fontSize: text.base, fontWeight: weight.bold, color: c.text, minWidth: 56, textAlign: 'center' },
  currencyRow: { flexDirection: 'row', gap: space[2] },
  currencyBtn: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, paddingVertical: space[3], alignItems: 'center', backgroundColor: c.surface },
  currencyBtnActive: { backgroundColor: c.brand, borderColor: c.brand },
  currencyBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  currencyBtnTextActive: { color: colors.white },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { fontSize: text.xs, fontWeight: weight.bold, color: c.brand },
  itemRowEdit: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  itemDescInput: { flex: 1, paddingVertical: space[2] },
  itemQtyInput: { width: 56, paddingVertical: space[2], textAlign: 'center' },
  itemPriceInput: { width: 80, paddingVertical: space[2], textAlign: 'center' },
  removeItemBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[1] },
  totalLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
  totalValue: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text },
});

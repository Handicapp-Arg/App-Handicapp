import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBills, useSendBill, useApproveBill, useDisputeBill, STATUS_META, monthLabel } from '../../../hooks/use-billing';
import { formatMoney } from '../../../lib/currency';
import { useAuth } from '../../../lib/auth';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormSheet } from '../../../components/FormSheet';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';

// STATUS_META (hooks/use-billing.ts) trae hex fijos, no dark-safe. Remapeamos
// acá a los semánticos del theme, igual que en la lista y en contratos.tsx.
const makeStatusColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  borrador:  { bg: c.surfaceAlt, text: c.textMuted },
  enviada:   { bg: c.infoSoft, text: c.info },
  aprobada:  { bg: c.successSoft, text: c.success },
  disputada: { bg: c.dangerSoft, text: c.danger },
});

function DisputeSheet({ visible, onClose, billId }: { visible: boolean; onClose: () => void; billId: string }) {
  const { typography, button } = useCommonStyles();
  const { c } = useTheme();
  const dispute = useDisputeBill();
  const [reason, setReason] = useState('');

  // La hoja no se destruye al cerrarse, así que el motivo se limpia al abrir.
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
            style={[button.danger, { flex: 1, borderWidth: 0, backgroundColor: c.danger }, (!reason.trim() || dispute.isPending) && { opacity: 0.6 }]}
            disabled={!reason.trim() || dispute.isPending}
            onPress={async () => {
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
        style={{ borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.md, color: c.text, backgroundColor: c.surfaceAlt, height: 100, textAlignVertical: 'top' }}
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

export default function FacturaDetalleScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const billStatusColors = useMemo(() => makeStatusColors(c), [c]);

  // No hay endpoint GET /billing/:id — la factura sale del cache de la lista,
  // que ya se pobló al entrar por /facturacion.
  const { data: bills, isLoading, isError, refetch } = useBills();
  const bill = bills?.find((b) => b.id === id);

  const sendBill = useSendBill();
  const approveBill = useApproveBill();
  const [disputing, setDisputing] = useState(false);

  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';

  const handleSend = () => {
    if (!bill) return;
    haptic.medium();
    Alert.alert('Enviar factura', '¿Enviás esta factura al propietario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar', onPress: () => { haptic.success(); sendBill.mutate(bill.id); } },
    ]);
  };

  const handleApprove = () => {
    if (!bill) return;
    haptic.medium();
    Alert.alert('Aprobar factura', '¿Confirmás que aprobás esta factura?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Aprobar', onPress: () => { haptic.success(); approveBill.mutate(bill.id); } },
    ]);
  };

  if (isError && !bill) {
    return (
      <View style={s.root}>
        <ScreenHeader showBack title="Factura" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !bill) {
    return (
      <View style={s.root}>
        <ScreenHeader showBack title="Factura" />
        <View style={{ paddingHorizontal: space[4], paddingTop: space[6] }}>
          <Skeleton width="60%" height={16} style={{ marginBottom: space[2], alignSelf: 'center' }} />
          <Skeleton width="45%" height={36} style={{ marginBottom: space[8], alignSelf: 'center' }} />
          <Skeleton width="100%" height={48} style={{ marginBottom: space[3] }} />
          <Skeleton width="100%" height={48} />
        </View>
      </View>
    );
  }

  const meta = STATUS_META[bill.status];
  const sc = billStatusColors[bill.status] ?? billStatusColors.borrador;
  const showActions = (isEst && bill.status === 'borrador') || (isProp && bill.status === 'enviada');

  return (
    <View style={s.root}>
      <ScreenHeader showBack title="Factura" subtitle={`${bill.horse?.name ?? ''} · ${monthLabel(bill.month, bill.year)}`} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (showActions ? touch.button + space[8] : space[10]) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: monto total + estado */}
        <View style={s.hero}>
          <Text style={s.heroTotal}>{formatMoney(bill.total, bill.currency)}</Text>
          <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[s.statusText, { color: sc.text }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Ítems: filas planas */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ítems</Text>
          {bill.items.map((item, i) => (
            <View key={i} style={[s.itemRow, i < bill.items.length - 1 && s.itemRowDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={s.itemMeta}>{item.quantity} × {formatMoney(item.unit_price, bill.currency)}</Text>
              </View>
              <Text style={s.itemTotal}>{formatMoney(item.total, bill.currency)}</Text>
            </View>
          ))}
        </View>

        {bill.dispute_reason && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Disputa</Text>
            <Text style={s.disputeReason}>{bill.dispute_reason}</Text>
          </View>
        )}

        {bill.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Notas</Text>
            <Text style={s.notes}>{bill.notes}</Text>
          </View>
        )}

      </ScrollView>

      {/* Acciones según rol y estado — barra fija inferior, como remates/[id] */}
      {showActions && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          {isEst && bill.status === 'borrador' && (
            <TouchableOpacity
              style={[s.actionBtnBlue, { flex: 1 }]}
              onPress={handleSend}
              accessibilityRole="button"
              accessibilityLabel="Enviar factura al propietario"
            >
              <Text style={[s.actionBtnText, { color: c.info }]}>Enviar al propietario</Text>
            </TouchableOpacity>
          )}
          {isProp && bill.status === 'enviada' && (
            <>
              <TouchableOpacity
                style={[s.actionBtnGreen, { flex: 1 }]}
                onPress={handleApprove}
                accessibilityRole="button"
                accessibilityLabel="Aprobar factura"
              >
                <Text style={[s.actionBtnText, { color: c.success }]}>Aprobar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtnRed, { flex: 1 }]}
                onPress={() => { haptic.light(); setDisputing(true); }}
                accessibilityRole="button"
                accessibilityLabel="Disputar factura"
              >
                <Text style={[s.actionBtnText, { color: c.danger }]}>Disputar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <DisputeSheet visible={disputing} billId={bill.id} onClose={() => setDisputing(false)} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  section: { marginHorizontal: space[4], marginTop: space[6] },
  sectionTitle: { fontSize: text.sm, fontWeight: weight.bold, color: c.textMuted, marginBottom: space[2] },

  hero: { alignItems: 'center', paddingVertical: space[8], gap: space[3] },
  heroTotal: { fontSize: text.display, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] + 2 },
  statusText: { fontSize: text.sm, fontWeight: weight.semibold },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3] },
  itemRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  itemDesc: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  itemMeta: { fontSize: text.xs, color: c.textFaint, marginTop: 2, fontVariant: ['tabular-nums'] },
  itemTotal: { fontSize: text.md, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },

  disputeReason: { fontSize: text.sm, color: c.danger, fontStyle: 'italic' },
  notes: { fontSize: text.sm, color: c.textFaint },

  footer: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  actionBtnBlue: { backgroundColor: c.infoSoft, borderRadius: radius.md, height: touch.button, justifyContent: 'center', alignItems: 'center' },
  actionBtnGreen: { backgroundColor: c.successSoft, borderRadius: radius.md, height: touch.button, justifyContent: 'center', alignItems: 'center' },
  actionBtnRed: { backgroundColor: c.dangerSoft, borderRadius: radius.md, height: touch.button, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { fontSize: text.md, fontWeight: weight.bold },
});

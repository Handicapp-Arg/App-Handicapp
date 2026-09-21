import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Receipt } from 'lucide-react-native';
import { useBills, useSendBill, useApproveBill, useDisputeBill, STATUS_META, monthLabel } from '../../../hooks/use-billing';
import { formatMoney } from '../../../lib/currency';
import { useAuth } from '../../../lib/auth';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { FormSheet } from '../../../components/FormSheet';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { PressableScale } from '../../../components/PressableScale';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch, brandShadow } from '../../../styles/tokens';
import { entradaFila } from '../../../styles/motion';
import { useCommonStyles } from '../../../styles/common';

// STATUS_META (hooks/use-billing.ts) trae hex fijos, no dark-safe. Remapeamos
// acá a los semánticos del theme, igual que en la lista y en contratos.tsx.
const makeStatusColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  borrador:  { bg: c.surfaceAlt, text: c.textMuted },
  enviada:   { bg: c.goldSoft, text: c.goldText },
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
      title="Observar factura"
      footer={
        // Un solo CTA: la X de la hoja ya cancela.
        <TouchableOpacity
          style={[button.danger, { flex: 1, backgroundColor: c.danger }, (!reason.trim() || dispute.isPending) && { opacity: 0.6 }]}
          disabled={!reason.trim() || dispute.isPending}
          onPress={async () => {
            await dispute.mutateAsync({ id: billId, reason });
            haptic.success();
            onClose();
          }}
        >
          {dispute.isPending
            ? <ActivityIndicator color={colors.white} size="small" />
            : <Text style={button.primaryText}>Enviar la observación</Text>
          }
        </TouchableOpacity>
      }
    >
      <Text style={typography.body}>Contá qué no cierra para que el establecimiento pueda revisarlo.</Text>
      <TextInput
        style={{ borderRadius: radius.field, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.md, color: c.text, backgroundColor: c.surfaceAlt, height: 100, textAlignVertical: 'top' }}
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
        placeholder="Qué querés observar..."
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
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Factura" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !bill) {
    // Misma silueta que la pantalla cargada: rótulo, monto grande, chip y filas.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Factura" />
        <View style={s.cuerpo}>
          <Skeleton width="40%" height={14} />
          <View style={{ height: space[2] }} />
          <Skeleton width="62%" height={40} />
          <View style={{ height: space[3] }} />
          <Skeleton width={120} height={27} borderRadius={radius.full} />
          <View style={{ height: space[7] }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[s.itemFila, i < 2 && s.itemDivisor]}>
              <Skeleton width={38} height={38} borderRadius={radius.thumb} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="55%" height={15} />
                <Skeleton width="35%" height={12} />
              </View>
              <Skeleton width={72} height={16} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const meta = STATUS_META[bill.status];
  const sc = billStatusColors[bill.status] ?? billStatusColors.borrador;
  const showActions = (isEst && bill.status === 'borrador') || (isProp && bill.status === 'enviada');

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (showActions ? touch.button + space[10] : space[10]) }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader scrollable showBack title="Factura" />

        {/* Hero de texto, sin caja: concepto chico, monto enorme, estado en chip.
            El backend no manda vencimiento ni emisor, así que no se inventan. */}
        <View style={s.cuerpo}>
          <Text style={s.heroRotulo} numberOfLines={1}>
            {bill.horse?.name ? `${bill.horse.name} · ` : ''}{monthLabel(bill.month, bill.year)}
          </Text>
          <Text style={s.heroMonto}>{formatMoney(bill.total, bill.currency)}</Text>
          <View style={[s.chip, { backgroundColor: sc.bg }]}>
            <View style={[s.chipPunto, { backgroundColor: sc.text }]} />
            <Text style={[s.chipText, { color: sc.text }]}>{meta?.label ?? ''}</Text>
          </View>

          <Text style={s.grupo}>Qué te cobran</Text>
          {bill.items.map((item, i) => (
            <Animated.View key={i} entering={entradaFila(i)} style={[s.itemFila, i < bill.items.length - 1 && s.itemDivisor]}>
              <View style={s.cajita}>
                <Receipt size={18} color={c.textMuted} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.itemDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={s.itemMeta}>{item.quantity} × {formatMoney(item.unit_price, bill.currency)}</Text>
              </View>
              <Text style={s.itemTotal}>{formatMoney(item.total, bill.currency)}</Text>
            </Animated.View>
          ))}

          <View style={s.totalFila}>
            <Text style={s.totalRotulo}>Total</Text>
            <Text style={s.totalMonto}>{formatMoney(bill.total, bill.currency)}</Text>
          </View>

          {bill.dispute_reason && (
            <>
              <Text style={[s.grupo, { color: c.danger }]}>Lo que observaste</Text>
              <Text style={s.disputeReason}>{bill.dispute_reason}</Text>
            </>
          )}

          {bill.notes && (
            <>
              <Text style={s.grupo}>Notas</Text>
              <Text style={s.notes}>{bill.notes}</Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Acciones: el verde es la acción, lo secundario va en campo neutro. */}
      {showActions && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          {isEst && bill.status === 'borrador' && (
            <PressableScale
              style={[s.btn, s.btnPrimario]}
              onPress={handleSend}
              accessibilityRole="button"
              accessibilityLabel="Enviar factura al propietario"
            >
              <Text style={s.btnPrimarioText}>Enviar al propietario</Text>
            </PressableScale>
          )}
          {isProp && bill.status === 'enviada' && (
            <>
              <PressableScale
                style={[s.btn, s.btnSecundario]}
                onPress={() => { haptic.light(); setDisputing(true); }}
                accessibilityRole="button"
                accessibilityLabel="Observar factura"
              >
                <Text style={s.btnSecundarioText}>Observar</Text>
              </PressableScale>
              <PressableScale
                style={[s.btn, s.btnPrimario, { flex: 1 }]}
                onPress={handleApprove}
                accessibilityRole="button"
                accessibilityLabel="Aprobar factura"
              >
                <Text style={s.btnPrimarioText}>Aprobar</Text>
              </PressableScale>
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
  cuerpo: { paddingHorizontal: space[4], paddingTop: space[2] },

  heroRotulo: { fontSize: text.sm, color: c.textFaint },
  heroMonto: { fontSize: text.display, fontWeight: weight.bold, color: c.text, letterSpacing: -1.4, marginTop: space[1], fontVariant: ['tabular-nums'] },
  chip: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] + 2, marginTop: space[3] },
  chipPunto: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: text.xs, fontWeight: weight.semibold },

  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginTop: space[7], marginBottom: space[1] },

  itemFila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  itemDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  cajita: { width: 38, height: 38, borderRadius: radius.thumb, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemDesc: { fontSize: text.base, fontWeight: weight.semibold, color: c.text },
  itemMeta: { fontSize: text.xs, color: c.textFaint, marginTop: 2, fontVariant: ['tabular-nums'] },
  itemTotal: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },

  totalFila: { flexDirection: 'row', alignItems: 'center', paddingTop: space[4] },
  totalRotulo: { flex: 1, fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  totalMonto: { fontSize: text.lg, fontWeight: weight.bold, color: c.text, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },

  disputeReason: { fontSize: text.base, color: c.danger, lineHeight: 22 },
  notes: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },

  // Footer sin borde: solo aire, como eventos/nuevo.
  footer: { flexDirection: 'row', gap: space[2] + 2, paddingHorizontal: space[4], paddingTop: space[3], backgroundColor: c.bg },
  btn: { height: touch.button, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  btnPrimario: { flex: 1, backgroundColor: c.brand, ...(c.isDark ? {} : brandShadow(c.brand)) },
  btnPrimarioText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
  btnSecundario: { width: 130, backgroundColor: c.surfaceAlt },
  btnSecundarioText: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted },
});

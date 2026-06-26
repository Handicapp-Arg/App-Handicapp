import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBills, useSendBill, useApproveBill, useDisputeBill, STATUS_META, monthLabel } from '../../hooks/use-billing';
import { formatCurrency } from '../../lib/currency';
import { useAuth } from '../../lib/auth';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { space, text, radius, weight } from '../../styles/tokens';
import { layout, typography, modal as modalStyle, button } from '../../styles/common';

function DisputeModal({ billId, onClose }: { billId: string; onClose: () => void }) {
  const dispute = useDisputeBill();
  const [reason, setReason] = useState('');

  return (
    <KeyboardAvoidingView style={modalStyle.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={modalStyle.sheet} entering={SlideInDown.springify().damping(20).stiffness(170)}>
        <View style={modalStyle.header}>
          <Text style={modalStyle.title}>Disputar factura</Text>
          <TouchableOpacity onPress={onClose}><Text style={modalStyle.closeText}>✕</Text></TouchableOpacity>
        </View>
        <View style={[modalStyle.body, { gap: space[4] }]}>
          <Text style={typography.body}>Explicá el motivo de la disputa para que el establecimiento pueda revisarlo.</Text>
          <TextInput
            style={styles.textarea}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            placeholder="Motivo de la disputa..."
            placeholderTextColor={colors.gray400}
          />
        </View>
        <View style={modalStyle.footer}>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={onClose}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.disputeBtn, (!reason.trim() || dispute.isPending) && { opacity: 0.6 }]}
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
  const { data: bills, isLoading, refetch, isRefetching } = useBills();
  const sendBill = useSendBill();
  const approveBill = useApproveBill();
  const [disputingId, setDisputingId] = useState<string | null>(null);

  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';

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
          <ScreenHeader scrollable title="Facturación" />
          <View style={{ padding: space[4], gap: space[3] }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={styles.billCard}>
                <View style={styles.billHeader}>
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
          <ScreenHeader scrollable title="Facturación" />
          <EmptyState
            icon="receipt-outline"
            title={isEst ? 'Sin facturas creadas' : 'Sin facturas recibidas'}
            message={isEst ? 'Creá facturas de pensión para enviar a los propietarios.' : 'Las facturas del establecimiento aparecerán aquí para que puedas aprobarlas.'}
            tint="#9d6c35"
          />
        </View>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: space[8], gap: space[3] }}
          ListHeaderComponent={<ScreenHeader scrollable title="Facturación" />}
          renderItem={({ item: bill, index }) => {
            const meta = STATUS_META[bill.status];
            return (
              <Animated.View style={[styles.billCard, { marginHorizontal: space[4] }]} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                {/* Header */}
                <View style={styles.billHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {bill.horse && <Text style={styles.horseName}>{bill.horse.name}</Text>}
                    <Text style={styles.period}>{monthLabel(bill.month, bill.year)}</Text>
                  </View>
                  <Text style={styles.total}>{formatCurrency(bill.total, bill.currency)}</Text>
                </View>

                {/* Items */}
                <View style={styles.itemsBox}>
                  {bill.items.map((item, i) => (
                    <View key={i} style={styles.itemRow}>
                      <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
                      <Text style={styles.itemTotal}>{formatCurrency(item.total, bill.currency)}</Text>
                    </View>
                  ))}
                </View>

                {bill.dispute_reason && (
                  <Text style={styles.disputeReason}>Disputa: {bill.dispute_reason}</Text>
                )}
                {bill.notes && <Text style={styles.notes}>{bill.notes}</Text>}

                {/* Acciones */}
                {isEst && bill.status === 'borrador' && (
                  <TouchableOpacity style={styles.actionBtnBlue} onPress={() => handleSend(bill.id)}>
                    <Text style={styles.actionBtnText}>Enviar al propietario</Text>
                  </TouchableOpacity>
                )}
                {isProp && bill.status === 'enviada' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtnGreen, { flex: 1 }]} onPress={() => handleApprove(bill.id)}>
                      <Text style={styles.actionBtnText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtnRed, { flex: 1 }]} onPress={() => setDisputingId(bill.id)}>
                      <Text style={styles.actionBtnText}>Disputar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            );
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!disputingId} animationType="fade" transparent statusBarTranslucent>
        {disputingId && <DisputeModal billId={disputingId} onClose={() => setDisputingId(null)} />}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[2] },
  billCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray100, padding: space[4], gap: space[3] },
  billHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  statusText: { fontSize: text.xs, fontWeight: weight.semibold },
  horseName: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  period: { fontSize: text.xs, color: colors.gray500 },
  total: { fontSize: text.xl, fontWeight: weight.extrabold, color: colors.gray900 },
  itemsBox: { backgroundColor: colors.gray50, borderRadius: radius.md, padding: space[3], gap: space[1] + 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemDesc: { fontSize: text.xs, color: colors.gray600, flex: 1, marginRight: space[2] },
  itemTotal: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray900 },
  disputeReason: { fontSize: text.xs, color: colors.red700, fontStyle: 'italic' },
  notes: { fontSize: text.xs, color: colors.gray400 },
  actionRow: { flexDirection: 'row', gap: space[2] },
  actionBtnBlue: { backgroundColor: '#eff6ff', borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  actionBtnGreen: { backgroundColor: '#f0fdf4', borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  actionBtnRed: { backgroundColor: '#fef2f2', borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
  actionBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray700 },
  textarea: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.sm, color: colors.gray900, backgroundColor: colors.gray50, height: 100, textAlignVertical: 'top' },
  disputeBtn: { flex: 1, backgroundColor: colors.red700, borderRadius: radius.md, paddingVertical: space[3], alignItems: 'center' },
});

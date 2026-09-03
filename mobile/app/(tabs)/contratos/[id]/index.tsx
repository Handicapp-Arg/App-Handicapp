import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useContracts, useRejectContract, useDeleteContract, type Contract } from '../../../../hooks/use-contracts';
import { useAuth } from '../../../../lib/auth';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Routes } from '../../../../lib/routes';
import { Spinner } from '../../../../components/Spinner';
import { FormSheet } from '../../../../components/FormSheet';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../../styles/tokens';
import { AppImage } from '../../../../components/AppImage';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', signed: 'Firmado', rejected: 'Rechazado',
};
const makeStatusColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  pending:  { bg: c.warningSoft, text: c.warning },
  signed:   { bg: c.successSoft, text: c.success },
  rejected: { bg: c.dangerSoft, text: c.danger },
});

export default function ContratoDetailScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  // No hay endpoint por id: el detalle sale de la lista ya cacheada.
  const { data: contracts, isLoading } = useContracts();
  const rejectContract = useRejectContract();
  const deleteContract = useDeleteContract();

  const contract = contracts?.find((ct) => ct.id === id) ?? null;

  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!rejecting) return;
    setRejectReason('');
  }, [rejecting]);

  if (isLoading || !contract) return <Spinner />;

  const statusColors = makeStatusColors(c);
  const sc = statusColors[contract.status] ?? statusColors.pending;
  const isOwner = contract.owner_id === user?.id;
  const isEstab = contract.establishment_id === user?.id;
  const ownerSigned = !!contract.signed_at;
  const estabSigned = !!contract.establishment_signed_at;
  const fmtDate = (d: string | null) => (d ? fechaHumana(d) : '');

  const partialMsg =
    contract.status === 'pending' && estabSigned && !ownerSigned
      ? 'Firmado por el establecimiento — falta la firma del propietario'
      : contract.status === 'pending' && ownerSigned && !estabSigned
        ? 'Firmado por el propietario — falta la firma del establecimiento'
        : null;

  const showOwnerActions = isOwner && contract.status === 'pending' && !ownerSigned;
  const showEstabSign = isEstab && contract.status === 'pending' && !estabSigned;
  const showActions = showOwnerActions || showEstabSign;

  const subtitle = isOwner ? contract.establishment?.name : contract.owner?.name;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title={contract.title} subtitle={subtitle} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (showActions ? touch.button + space[8] : space[10]) }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.section}>
          <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
            <View style={[s.statusDot, { backgroundColor: sc.text }]} />
            <Text style={[s.statusText, { color: sc.text }]}>{STATUS_LABEL[contract.status]}</Text>
          </View>
          {contract.horse && (
            <View style={s.horseBadge}>
              <Text style={s.horseText}>{contract.horse.name}</Text>
            </View>
          )}
        </View>

        {contract.status === 'signed' && (
          <View style={[s.banner, s.signedBanner]}>
            <Check size={13} color={c.success} strokeWidth={2.5} />
            <Text style={s.signedText}>Firmado por ambas partes · {fmtDate(contract.signed_at)}</Text>
          </View>
        )}
        {partialMsg && (
          <View style={[s.banner, s.pendingBanner]}>
            <Check size={13} color={c.warning} strokeWidth={2.5} />
            <Text style={s.pendingText}>{partialMsg}</Text>
          </View>
        )}
        {contract.status === 'rejected' && contract.rejection_reason && (
          <View style={[s.banner, s.rejectedBanner]}>
            <X size={13} color={c.danger} strokeWidth={2.5} />
            <Text style={s.rejectedText}>Motivo: {contract.rejection_reason}</Text>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.bodyText}>{contract.body}</Text>
        </View>

        {contract.status === 'signed' && (
          <View style={s.section}>
            <Text style={s.signBlockLabel}>FIRMA ELECTRÓNICA</Text>
            <View style={s.signRow}>
              {([
                { label: 'Establecimiento', name: contract.establishment_signed_name ?? contract.establishment?.name, url: contract.establishment_signature_url, at: contract.establishment_signed_at },
                { label: 'Propietario', name: contract.signed_name ?? contract.owner?.name, url: contract.owner_signature_url, at: contract.signed_at },
              ]).map((p) => (
                <View key={p.label} style={s.signCell}>
                  {p.url ? (
                    <AppImage source={{ uri: p.url }} style={s.signImg} contentFit="contain" />
                  ) : (
                    <View style={s.signImg} />
                  )}
                  <View style={s.signLine} />
                  <Text style={s.signName} numberOfLines={1}>{p.name ?? '—'}</Text>
                  <Text style={s.signRole}>{p.label} · {fmtDate(p.at)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {isEstab && contract.status === 'pending' && (
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => Alert.alert('Cancelar contrato', '¿Querés cancelar este contrato?', [
              { text: 'No', style: 'cancel' },
              { text: 'Sí, cancelar', style: 'destructive', onPress: () => { deleteContract.mutate(contract.id); router.back(); } },
            ])}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Cancelar contrato"
          >
            <Text style={s.deleteBtnText}>Cancelar contrato</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {showActions && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          {showOwnerActions && (
            <TouchableOpacity style={s.rejectBtn} onPress={() => setRejecting(true)} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Rechazar contrato">
              <Text style={s.rejectBtnText}>Rechazar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={s.signBtn}
            onPress={() => { haptic.selection(); router.push(Routes.contratoFirmar(contract.id) as never); }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Firmar contrato"
          >
            <Text style={s.signBtnText}>Firmar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hoja rechazar: decisión puntual con un solo campo opcional */}
      <FormSheet
        visible={rejecting}
        onClose={() => setRejecting(false)}
        title="Rechazar contrato"
        footer={
          <>
            <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setRejecting(false)}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rejectSubmitBtn, { flex: 1 }, rejectContract.isPending && { opacity: 0.5 }]}
              disabled={rejectContract.isPending}
              onPress={async () => {
                await rejectContract.mutateAsync({ id: contract.id, reason: rejectReason });
                setRejecting(false);
              }}
              activeOpacity={0.85}
            >
              {rejectContract.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitBtnText}>Confirmar rechazo</Text>
              }
            </TouchableOpacity>
          </>
        }
      >
        <Text style={s.fieldLabel}>Motivo del rechazo (opcional):</Text>
        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
          value={rejectReason} onChangeText={setRejectReason}
          placeholder="Indicá el motivo..." placeholderTextColor={c.textFaint}
          multiline
        />
      </FormSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  section: { paddingHorizontal: space[4], marginBottom: space[4], gap: space[2] },
  statusBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: text.xs, fontWeight: weight.bold },
  horseBadge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3, backgroundColor: c.surfaceAlt },
  horseText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginBottom: space[4], borderRadius: radius.md, padding: space[3] },
  signedBanner: { backgroundColor: c.successSoft },
  signedText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.success },
  pendingBanner: { backgroundColor: c.warningSoft },
  pendingText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.warning },
  rejectedBanner: { backgroundColor: c.dangerSoft },
  rejectedText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.danger },
  bodyText: { fontSize: text.md, color: c.text, lineHeight: 24 },
  signBlockLabel: { fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint, letterSpacing: 0.8 },
  signRow: { flexDirection: 'row', gap: space[3] },
  signCell: { flex: 1 },
  signImg: { width: '100%', height: 64, backgroundColor: c.surfaceAlt, borderRadius: radius.sm },
  signLine: { height: 1, backgroundColor: c.borderStrong, marginTop: 2, marginBottom: space[2] },
  signName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  signRole: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },
  deleteBtn: { marginHorizontal: space[4], marginTop: space[2], borderRadius: radius.md, backgroundColor: c.surfaceAlt, paddingVertical: space[3], alignItems: 'center' },
  deleteBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  footer: { flexDirection: 'row', gap: space[3], paddingHorizontal: space[4], paddingTop: space[3], borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  signBtn: { flex: 1, height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.success, alignItems: 'center' },
  signBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
  rejectBtn: { flex: 1, height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  rejectBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  input: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  cancelBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  cancelBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.textMuted },
  submitBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
  rejectSubmitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.danger, alignItems: 'center' },
});

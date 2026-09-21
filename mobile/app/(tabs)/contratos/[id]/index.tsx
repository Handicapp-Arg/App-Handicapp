import { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, X, ShieldCheck } from 'lucide-react-native';
import { useContracts, useRejectContract, useDeleteContract } from '../../../../hooks/use-contracts';
import { useAuth } from '../../../../lib/auth';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { Routes } from '../../../../lib/routes';
import { Skeleton } from '../../../../components/Skeleton';
import { FormSheet } from '../../../../components/FormSheet';
import { PressableScale } from '../../../../components/PressableScale';
import { haptic } from '../../../../lib/haptics';
import { colors } from '../../../../lib/colors';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, radius, weight, touch, shadow, brandShadow } from '../../../../styles/tokens';
import { entradaFila } from '../../../../styles/motion';
import { AppImage } from '../../../../components/AppImage';

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

  // La hoja queda montada: limpiamos el motivo cada vez que se abre.
  useEffect(() => {
    if (!rejecting) return;
    setRejectReason('');
  }, [rejecting]);

  if (isLoading || !contract) {
    // Misma silueta que el contrato real: tarjeta de texto + dos filas de estado.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Contrato" />
        <View style={s.cuerpo}>
          <Skeleton width="100%" height={180} borderRadius={radius.card} />
          <View style={{ height: space[5] }} />
          <Skeleton width="70%" height={16} />
          <View style={{ height: space[4] }} />
          <Skeleton width="55%" height={16} />
        </View>
      </View>
    );
  }

  const isOwner = contract.owner_id === user?.id;
  const isEstab = contract.establishment_id === user?.id;
  const ownerSigned = !!contract.signed_at;
  const estabSigned = !!contract.establishment_signed_at;
  const fmtDate = (d: string | null) => (d ? fechaHumana(d) : '');

  const showOwnerActions = isOwner && contract.status === 'pending' && !ownerSigned;
  const showEstabSign = isEstab && contract.status === 'pending' && !estabSigned;
  const showActions = showOwnerActions || showEstabSign;

  const contraparte = isOwner ? contract.establishment?.name : contract.owner?.name;

  // Filas de estado: quién firmó y si el texto quedó protegido. Reemplazan a
  // los tres banners de color que había antes (una caja por cada aviso).
  const filasEstado: { Icon: typeof Check; tinta: string; texto: string; detalle: string }[] = [
    {
      Icon: estabSigned ? Check : X,
      tinta: estabSigned ? c.brand : c.textFaint,
      texto: 'Firmó la caballeriza',
      detalle: estabSigned ? fmtDate(contract.establishment_signed_at) : 'Todavía no',
    },
    {
      Icon: ownerSigned ? Check : X,
      tinta: ownerSigned ? c.brand : c.textFaint,
      texto: 'Firmó el propietario',
      detalle: ownerSigned ? fmtDate(contract.signed_at) : 'Todavía no',
    },
  ];
  if (contract.body_hash) {
    filasEstado.push({
      Icon: ShieldCheck, tinta: c.brand,
      texto: 'Texto protegido', detalle: 'No se puede cambiar',
    });
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + (showActions ? touch.button + space[10] : space[10]) }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader scrollable showBack title={contract.title} subtitle={contraparte} />

        <View style={s.cuerpo}>
          {contract.status === 'rejected' && (
            <View style={s.avisoRechazo}>
              <X size={17} color={c.danger} strokeWidth={2.3} />
              <Text style={s.avisoRechazoText}>
                {contract.rejection_reason ? `Rechazado · ${contract.rejection_reason}` : 'Rechazado'}
              </Text>
            </View>
          )}

          {/* El texto del contrato ES el contenido: va en tarjeta, sin recortar. */}
          <View style={s.tarjetaTexto}>
            <Text style={s.bodyText}>{contract.body}</Text>
          </View>

          {contract.horse && (
            <View style={s.chipCaballo}>
              <Text style={s.chipCaballoText}>{contract.horse.name}</Text>
            </View>
          )}

          <View style={s.estados}>
            {filasEstado.map((f, i) => (
              <Animated.View key={f.texto} entering={entradaFila(i)} style={[s.estadoFila, i < filasEstado.length - 1 && s.estadoDivisor]}>
                <f.Icon size={19} color={f.tinta} strokeWidth={2.2} />
                <Text style={s.estadoTexto}>{f.texto}</Text>
                <Text style={s.estadoDetalle}>{f.detalle}</Text>
              </Animated.View>
            ))}
          </View>

          {contract.status === 'signed' && (
            <>
              <Text style={s.grupo}>Firma electrónica</Text>
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
            </>
          )}

          {isEstab && contract.status === 'pending' && (
            <PressableScale
              style={s.cancelarBtn}
              onPress={() => Alert.alert('Cancelar contrato', '¿Querés cancelar este contrato?', [
                { text: 'No', style: 'cancel' },
                { text: 'Sí, cancelar', style: 'destructive', onPress: () => { haptic.light(); deleteContract.mutate(contract.id); router.back(); } },
              ])}
              accessibilityRole="button"
              accessibilityLabel="Cancelar contrato"
            >
              <Text style={s.cancelarBtnText}>Cancelar contrato</Text>
            </PressableScale>
          )}
        </View>
      </ScrollView>

      {showActions && (
        <View style={[s.footer, { paddingBottom: insets.bottom + space[4] }]}>
          {showOwnerActions && (
            <PressableScale
              style={[s.btn, s.btnSecundario]}
              onPress={() => { haptic.light(); setRejecting(true); }}
              accessibilityRole="button"
              accessibilityLabel="Rechazar contrato"
            >
              <Text style={s.btnSecundarioText}>Rechazar</Text>
            </PressableScale>
          )}
          <PressableScale
            style={[s.btn, s.btnPrimario]}
            onPress={() => { haptic.selection(); router.push(Routes.contratoFirmar(contract.id) as never); }}
            accessibilityRole="button"
            accessibilityLabel="Firmar contrato"
          >
            <Text style={s.btnPrimarioText}>Firmar</Text>
          </PressableScale>
        </View>
      )}

      {/* Hoja rechazar: decisión puntual con un solo campo opcional */}
      <FormSheet
        visible={rejecting}
        onClose={() => setRejecting(false)}
        title="Rechazar contrato"
        footer={
          // Un solo CTA destructivo: la X de la hoja ya cancela.
          <TouchableOpacity
            style={[s.rejectSubmitBtn, { flex: 1 }, rejectContract.isPending && { opacity: 0.5 }]}
            disabled={rejectContract.isPending}
            onPress={async () => {
              await rejectContract.mutateAsync({ id: contract.id, reason: rejectReason });
              haptic.success();
              setRejecting(false);
            }}
            activeOpacity={0.85}
          >
            {rejectContract.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={s.btnPrimarioText}>Rechazar contrato</Text>
            }
          </TouchableOpacity>
        }
      >
        <TextInput
          style={s.input}
          value={rejectReason} onChangeText={setRejectReason}
          placeholder="Motivo del rechazo (opcional)" placeholderTextColor={c.textFaint}
          multiline
        />
      </FormSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  cuerpo: { paddingHorizontal: space[4], paddingTop: space[2] },

  avisoRechazo: { flexDirection: 'row', alignItems: 'center', gap: space[2], backgroundColor: c.dangerSoft, borderRadius: radius.field, padding: space[3], marginBottom: space[4] },
  avisoRechazoText: { flex: 1, fontSize: text.sm, fontWeight: weight.semibold, color: c.danger },

  tarjetaTexto: { backgroundColor: c.surface, borderRadius: radius.card, padding: space[4] + 2, ...(c.isDark ? {} : shadow.md) },
  bodyText: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },

  chipCaballo: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] + 2, backgroundColor: c.surfaceAlt, marginTop: space[4] },
  chipCaballoText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },

  estados: { marginTop: space[5] },
  estadoFila: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  estadoDivisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  estadoTexto: { flex: 1, fontSize: text.base, color: c.text },
  estadoDetalle: { fontSize: text.sm, color: c.textFaint },

  grupo: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint, marginTop: space[7], marginBottom: space[3] },
  signRow: { flexDirection: 'row', gap: space[3] },
  signCell: { flex: 1 },
  signImg: { width: '100%', height: 64, backgroundColor: c.surfaceAlt, borderRadius: radius.thumb },
  signLine: { height: 1, backgroundColor: c.border, marginTop: 2, marginBottom: space[2] },
  signName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  signRole: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },

  cancelarBtn: { marginTop: space[7], borderRadius: radius.button, backgroundColor: c.surfaceAlt, height: touch.button, alignItems: 'center', justifyContent: 'center' },
  cancelarBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted },

  // Footer sin borde: solo aire, como eventos/nuevo.
  footer: { flexDirection: 'row', gap: space[2] + 2, paddingHorizontal: space[4], paddingTop: space[3], backgroundColor: c.bg },
  btn: { flex: 1, height: touch.button, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center' },
  btnPrimario: { backgroundColor: c.brand, ...(c.isDark ? {} : brandShadow(c.brand)) },
  btnPrimarioText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
  btnSecundario: { backgroundColor: c.surfaceAlt },
  btnSecundarioText: { fontSize: text.base, fontWeight: weight.semibold, color: c.textMuted },

  rejectSubmitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.button, backgroundColor: c.danger, alignItems: 'center' },
  input: { borderRadius: radius.field, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt, height: 100, textAlignVertical: 'top' },
});

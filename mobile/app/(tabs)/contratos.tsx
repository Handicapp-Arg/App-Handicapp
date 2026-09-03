import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileText, ChevronDown, X, Check, Plus } from 'lucide-react-native';
import { PressableScale } from '../../components/PressableScale';
import { useContracts, useCreateContract, useSignContract, useRejectContract, useDeleteContract, useLookupUserByEmail, type Contract } from '../../hooks/use-contracts';
import { useAuth } from '../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../components/ScreenHeader';
import { Routes } from '../../lib/routes';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { Skeleton } from '../../components/Skeleton';
import { FormSheet } from '../../components/FormSheet';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { fechaHumana } from '../../lib/fechas';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch } from '../../styles/tokens';
import { AppImage } from '../../components/AppImage';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', signed: 'Firmado', rejected: 'Rechazado',
};
// Estados reales del contrato -> semánticos del theme (dark-safe).
const makeStatusColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  pending:  { bg: c.warningSoft, text: c.warning },
  signed:   { bg: c.successSoft, text: c.success },
  rejected: { bg: c.dangerSoft, text: c.danger },
});

const DEFAULT_BODY = `CONTRATO DE PENSIÓN EQUINA

Entre el establecimiento y el propietario, se acuerda:

1. El caballo quedará alojado en las instalaciones del establecimiento.
2. El propietario se compromete al pago mensual según lo acordado.
3. El establecimiento proveerá alimentación, veterinaria básica y cuidados diarios.
4. Gastos extraordinarios serán consultados previamente con el propietario.
5. El contrato tiene duración mínima de 3 meses, renovable automáticamente.

Firmado digitalmente en HandicApp.`;

function ContractCard({
  contract, userId, role, onSign, onReject, onDelete, isLast, c, cs,
}: {
  contract: Contract; userId: string; role: string;
  onSign: (c: Contract) => void;
  onReject: (c: Contract) => void;
  onDelete: (id: string) => void;
  isLast?: boolean;
  c: ThemeColors;
  cs: CStyles;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColors = makeStatusColors(c);
  const sc = statusColors[contract.status] ?? statusColors.pending;
  const isOwner = contract.owner_id === userId;
  const isEstab = contract.establishment_id === userId;
  const ownerSigned = !!contract.signed_at;
  const estabSigned = !!contract.establishment_signed_at;
  const dateStr = fechaHumana(contract.created_at);
  const fmtDate = (d: string | null) => (d ? fechaHumana(d) : '');

  // Aviso de firma parcial (una parte firmó, falta la otra).
  const partialMsg =
    contract.status === 'pending' && estabSigned && !ownerSigned
      ? 'Firmado por el establecimiento — falta la firma del propietario'
      : contract.status === 'pending' && ownerSigned && !estabSigned
        ? 'Firmado por el propietario — falta la firma del establecimiento'
        : null;

  const showOwnerActions = isOwner && contract.status === 'pending' && !ownerSigned;
  const showEstabSign = isEstab && contract.status === 'pending' && !estabSigned;

  return (
    <View style={[expanded ? cs.cardExpanded : cs.rowCollapsed, !expanded && !isLast && cs.rowDivider]}>
      <TouchableOpacity
        onPress={() => { haptic.selection(); setExpanded((p) => !p); }}
        activeOpacity={0.7}
        style={cs.cardHeader}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Contraer contrato' : 'Ver contrato completo'}
      >
        <View style={cs.docIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <FileText size={22} color={c.text} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={cs.title} numberOfLines={1}>{contract.title}</Text>
          <Text style={cs.meta} numberOfLines={1}>
            {isOwner ? `De ${contract.establishment?.name}` : `Para ${contract.owner?.name}`} · {dateStr}
          </Text>
          <View style={cs.tagRow}>
            <View style={[cs.statusBadge, { backgroundColor: sc.bg }]}>
              <View style={[cs.statusDot, { backgroundColor: sc.text }]} />
              <Text style={[cs.statusText, { color: sc.text }]}>{STATUS_LABEL[contract.status]}</Text>
            </View>
            {contract.horse && (
              <View style={cs.horseBadge}>
                <Text style={cs.horseText}>{contract.horse.name}</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronDown
          size={20}
          color={c.textFaint}
          strokeWidth={2}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {contract.status === 'signed' && (
        <View style={cs.signedBanner}>
          <Check size={13} color={c.success} strokeWidth={2.5} />
          <Text style={cs.signedText}>
            Firmado por ambas partes · {fmtDate(contract.signed_at)}
          </Text>
        </View>
      )}
      {partialMsg && (
        <View style={cs.pendingBanner}>
          <Check size={13} color={c.warning} strokeWidth={2.5} />
          <Text style={cs.pendingText}>{partialMsg}</Text>
        </View>
      )}
      {contract.status === 'rejected' && contract.rejection_reason && (
        <View style={cs.rejectedBanner}>
          <X size={13} color={c.danger} strokeWidth={2.5} />
          <Text style={cs.rejectedText}>Motivo: {contract.rejection_reason}</Text>
        </View>
      )}

      {expanded && (
        <View style={cs.body}>
          <ScrollView style={cs.bodyScroll} nestedScrollEnabled>
            <Text style={cs.bodyText}>{contract.body}</Text>
          </ScrollView>

          {/* Presentación: ambas firmas al pie del contrato firmado */}
          {contract.status === 'signed' && (
            <View style={cs.signBlock}>
              <Text style={cs.signBlockLabel}>FIRMA ELECTRÓNICA</Text>
              <View style={cs.signRow}>
                {([
                  { label: 'Establecimiento', name: contract.establishment_signed_name ?? contract.establishment?.name, url: contract.establishment_signature_url, at: contract.establishment_signed_at },
                  { label: 'Propietario', name: contract.signed_name ?? contract.owner?.name, url: contract.owner_signature_url, at: contract.signed_at },
                ]).map((p) => (
                  <View key={p.label} style={cs.signCell}>
                    {p.url ? (
                      <AppImage source={{ uri: p.url }} style={cs.signImg} contentFit="contain" />
                    ) : (
                      <View style={cs.signImg} />
                    )}
                    <View style={cs.signLine} />
                    <Text style={cs.signName} numberOfLines={1}>{p.name ?? '—'}</Text>
                    <Text style={cs.signRole}>{p.label} · {fmtDate(p.at)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {(showOwnerActions || showEstabSign) && (
            <View style={cs.actions}>
              {showOwnerActions && (
                <PressableScale style={cs.rejectBtn} onPress={() => onReject(contract)}>
                  <Text style={cs.rejectBtnText}>Rechazar</Text>
                </PressableScale>
              )}
              {(showOwnerActions || showEstabSign) && (
                <PressableScale style={cs.signBtn} onPress={() => onSign(contract)}>
                  <Text style={cs.signBtnText}>Firmar</Text>
                </PressableScale>
              )}
            </View>
          )}
          {isEstab && contract.status === 'pending' && (
            <TouchableOpacity
              style={cs.deleteBtn}
              onPress={() => Alert.alert('Cancelar contrato', '¿Querés cancelar este contrato?', [
                { text: 'No', style: 'cancel' },
                { text: 'Sí, cancelar', style: 'destructive', onPress: () => onDelete(contract.id) },
              ])}
              activeOpacity={0.8}
            >
              <Text style={cs.deleteBtnText}>Cancelar contrato</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

export default function ContratosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const cs = useMemo(() => makeCStyles(c), [c]);
  const { data: contracts, isLoading, isError, refetch, isRefetching } = useContracts();
  const createContract = useCreateContract();
  const signContract = useSignContract();
  const rejectContract = useRejectContract();
  const deleteContract = useDeleteContract();

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('Contrato de Pensión');
  const [createOwnerEmail, setCreateOwnerEmail] = useState('');
  const [createBody, setCreateBody] = useState(DEFAULT_BODY);
  const [emailToSearch, setEmailToSearch] = useState('');
  const { data: foundUser, isFetching: searchingUser } = useLookupUserByEmail(emailToSearch);

  // La hoja ya no se destruye al cerrarse: limpiamos el formulario al abrir.
  useEffect(() => {
    if (!showCreate) return;
    setCreateTitle('Contrato de Pensión');
    setCreateOwnerEmail('');
    setCreateBody(DEFAULT_BODY);
    setEmailToSearch('');
  }, [showCreate]);

  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [signedName, setSignedName] = useState('');
  const [rejectingContract, setRejectingContract] = useState<Contract | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const signatureRef = useRef<SignatureViewRef>(null);
  // El canvas de firma vive dentro del ScrollView del FormSheet: sin esto, el
  // scroll se roba el gesto a mitad de trazo y la firma sale cortada.
  const [scrollFirma, setScrollFirma] = useState(true);

  // La hoja de rechazo ya no se destruye al cerrarse: limpiamos el motivo al abrir.
  useEffect(() => {
    if (!rejectingContract) return;
    setRejectReason('');
  }, [rejectingContract]);

  const isEstab = user?.role === 'establecimiento' || user?.role === 'admin';

  // Abre el modal de firma autocompletando con el nombre del usuario.
  const openSign = (contract: Contract) => { setSignedName(user?.name ?? ''); setSigningContract(contract); };
  const closeSign = () => { setSigningContract(null); setSignedName(''); };

  // Recibe el dataURL del pad y ejecuta el alta multipart.
  const submitSignature = async (signature: string) => {
    if (!signingContract) return;
    if (!signature || signature === 'data:,') {
      Alert.alert('Firma requerida', 'Dibujá tu firma en el recuadro antes de confirmar.');
      return;
    }
    await signContract.mutateAsync({ id: signingContract.id, signature, signed_name: signedName.trim() });
    haptic.success();
    closeSign();
  };

  // Estilo del canvas (theme-aware). Ocultamos el footer nativo: usamos botones propios.
  const signatureWebStyle = useMemo(() => `
    .m-signature-pad { box-shadow: none; border: none; margin: 0; background-color: ${c.surfaceAlt}; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--body canvas { background-color: ${c.surfaceAlt}; }
    .m-signature-pad--footer { display: none; margin: 0; }
    body, html { margin: 0; height: 100%; background-color: ${c.surfaceAlt}; }
  `, [c]);

  const pending = contracts?.filter((c) => c.status === 'pending') ?? [];
  const others = contracts?.filter((c) => c.status !== 'pending') ?? [];

  const header = (
    <ScreenHeader
      scrollable
      title="Contratos"
      showBack
      backTo={Routes.mas}
      right={isEstab ? (
        <HeaderButton label="Nuevo" icon={Plus} onPress={() => { haptic.medium(); setShowCreate(true); }} />
      ) : undefined}
    />
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
      >
        {header}
        <View style={s.body}>
          {isLoading && pending.length === 0 && others.length === 0 ? (
            <View>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[cs.rowCollapsed, i < 4 && cs.rowDivider]}>
                  <View style={cs.cardHeader}>
                    <View style={{ flex: 1, gap: space[1] + 2 }}>
                      <Skeleton width={80} height={18} borderRadius={radius.full} />
                      <Skeleton width="65%" height={14} />
                      <Skeleton width="45%" height={11} />
                    </View>
                    <Skeleton width={14} height={14} />
                  </View>
                </View>
              ))}
            </View>
          ) : isError && !contracts?.length ? (
            <ErrorState onRetry={refetch} />
          ) : !contracts?.length ? (
            <EmptyState
              icon="document-text-outline"
              title="Sin contratos"
              message={isEstab ? 'Creá un contrato digital para que el propietario lo firme desde la app.' : 'No tenés contratos pendientes por el momento.'}
            />
          ) : (
            <>
              {pending.length > 0 && (
                <View style={s.group}>
                  <Text style={s.groupLabel}>PENDIENTES ({pending.length})</Text>
                  {pending.map((ct, index) => (
                    <Animated.View key={ct.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <ContractCard contract={ct} userId={user?.id ?? ''} role={user?.role ?? ''}
                        onSign={openSign} onReject={setRejectingContract} onDelete={(id) => deleteContract.mutate(id)}
                        isLast={index === pending.length - 1} c={c} cs={cs} />
                    </Animated.View>
                  ))}
                </View>
              )}
              {others.length > 0 && (
                <View style={s.group}>
                  <Text style={s.groupLabel}>HISTORIAL</Text>
                  {others.map((ct, index) => (
                    <Animated.View key={ct.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <ContractCard contract={ct} userId={user?.id ?? ''} role={user?.role ?? ''}
                        onSign={openSign} onReject={setRejectingContract} onDelete={(id) => deleteContract.mutate(id)}
                        isLast={index === others.length - 1} c={c} cs={cs} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Hoja crear contrato */}
      <FormSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nuevo contrato"
        footer={
          <>
            <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setShowCreate(false)}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, { flex: 1 }, (!foundUser || createContract.isPending) && { opacity: 0.5 }]}
              disabled={!foundUser || createContract.isPending || !createTitle.trim()}
              onPress={async () => {
                if (!foundUser) return;
                await createContract.mutateAsync({ owner_id: foundUser.id, title: createTitle.trim(), body: createBody });
                haptic.success();
                setShowCreate(false);
              }}
              activeOpacity={0.85}
            >
              {createContract.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitBtnText}>Crear contrato</Text>
              }
            </TouchableOpacity>
          </>
        }
      >
        {/* Buscar propietario por email */}
        <Text style={s.fieldLabel}>Email del propietario *</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={createOwnerEmail}
            onChangeText={setCreateOwnerEmail}
            placeholder="propietario@email.com"
            placeholderTextColor={c.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => setEmailToSearch(createOwnerEmail.trim())}
          />
          <TouchableOpacity
            style={[s.searchBtn, searchingUser && { opacity: 0.6 }]}
            onPress={() => setEmailToSearch(createOwnerEmail.trim())}
            disabled={searchingUser}
            activeOpacity={0.8}
          >
            {searchingUser
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.searchBtnText}>Buscar</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Resultado del lookup */}
        {emailToSearch && !searchingUser && (
          foundUser ? (
            <View style={s.userFound}>
              <Check size={18} color={c.success} strokeWidth={2.5} />
              <View style={{ flex: 1 }}>
                <Text style={s.userFoundName}>{foundUser.name}</Text>
                <Text style={s.userFoundRole}>{foundUser.role}</Text>
              </View>
            </View>
          ) : (
            <View style={s.userNotFound}>
              <Text style={s.userNotFoundText}>No se encontró ningún usuario con ese email.</Text>
            </View>
          )
        )}

        <Text style={[s.fieldLabel, { marginTop: 10 }]}>Título *</Text>
        <TextInput style={s.input} value={createTitle} onChangeText={setCreateTitle} placeholderTextColor={c.textFaint} />
        <Text style={[s.fieldLabel, { marginTop: 10 }]}>Cuerpo del contrato *</Text>
        <TextInput
          style={[s.input, { height: 180, textAlignVertical: 'top', paddingTop: 10 }]}
          value={createBody} onChangeText={setCreateBody} multiline placeholderTextColor={c.textFaint}
        />
        <Text style={s.hint}>El propietario podrá firmar o rechazar el contrato desde su app.</Text>
      </FormSheet>

      {/* Hoja firmar */}
      <FormSheet
        visible={!!signingContract}
        onClose={closeSign}
        scrollEnabled={scrollFirma}
        title="Firmar digitalmente"
        footer={
          <>
            <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={closeSign}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.signSubmitBtn, { flex: 1 }, (!signedName.trim() || signContract.isPending) && { opacity: 0.5 }]}
              disabled={!signedName.trim() || signContract.isPending}
              onPress={() => signatureRef.current?.readSignature()}
              activeOpacity={0.85}
            >
              {signContract.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.submitBtnText}>Confirmar firma</Text>
              }
            </TouchableOpacity>
          </>
        }
      >
        <Text style={s.fieldLabel}>Tu nombre completo</Text>
        <TextInput
          style={s.input} value={signedName} onChangeText={setSignedName}
          placeholder="Tu nombre completo" placeholderTextColor={c.textFaint}
          autoCapitalize="words"
        />

        <View style={s.signHeaderRow}>
          <Text style={s.fieldLabel}>Dibujá tu firma</Text>
          <TouchableOpacity onPress={() => signatureRef.current?.clearSignature()} activeOpacity={0.7} hitSlop={8}>
            <Text style={s.clearLink}>Limpiar</Text>
          </TouchableOpacity>
        </View>
        <View style={s.signPad}>
          <SignatureScreen
            ref={signatureRef}
            onBegin={() => setScrollFirma(false)}
            onEnd={() => setScrollFirma(true)}
            onOK={submitSignature}
            onEmpty={() => Alert.alert('Firma requerida', 'Dibujá tu firma en el recuadro antes de confirmar.')}
            webStyle={signatureWebStyle}
            penColor={c.brand}
            backgroundColor="transparent"
            autoClear={false}
            descriptionText=""
          />
        </View>
        <Text style={s.hint}>Al confirmar, la firma quedará registrada con fecha y hora.</Text>
      </FormSheet>

      {/* Hoja rechazar */}
      <FormSheet
        visible={!!rejectingContract}
        onClose={() => setRejectingContract(null)}
        title="Rechazar contrato"
        footer={
          <>
            <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setRejectingContract(null)}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rejectSubmitBtn, { flex: 1 }, rejectContract.isPending && { opacity: 0.5 }]}
              disabled={rejectContract.isPending}
              onPress={async () => {
                if (!rejectingContract) return;
                await rejectContract.mutateAsync({ id: rejectingContract.id, reason: rejectReason });
                setRejectingContract(null);
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

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 120 },
  body: { paddingHorizontal: space[4], paddingTop: space[2], gap: space[4] },
  group: { gap: 0 },
  groupLabel: { fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint, letterSpacing: 0.8, marginBottom: space[2] },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  input: { borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt },
  hint: { fontSize: text.xs, color: c.textFaint, marginTop: space[2] },
  signHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3] },
  clearLink: { fontSize: text.sm, fontWeight: weight.bold, color: c.brand },
  signPad: { height: 200, borderRadius: radius.md, backgroundColor: c.surfaceAlt, overflow: 'hidden' },
  cancelBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  cancelBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.textMuted },
  submitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.brand, alignItems: 'center' },
  submitBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
  signSubmitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.success, alignItems: 'center' },
  rejectSubmitBtn: { height: touch.button, justifyContent: 'center', borderRadius: radius.md, backgroundColor: c.danger, alignItems: 'center' },
  searchBtn: { height: touch.field, borderRadius: radius.md, backgroundColor: c.brand, paddingHorizontal: space[4], justifyContent: 'center', alignItems: 'center', minWidth: 70 },
  searchBtnText: { fontSize: text.md, fontWeight: weight.bold, color: colors.white },
  userFound: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.successSoft, borderRadius: radius.md, padding: space[3], marginTop: space[2] },
  userFoundName: { fontSize: text.sm, fontWeight: weight.bold, color: c.success },
  userFoundRole: { fontSize: text.xs, color: c.textMuted, textTransform: 'capitalize' },
  userNotFound: { backgroundColor: c.dangerSoft, borderRadius: radius.md, padding: space[3], marginTop: space[2] },
  userNotFoundText: { fontSize: text.xs, color: c.danger },
});

type CStyles = ReturnType<typeof makeCStyles>;

const makeCStyles = (c: ThemeColors) => StyleSheet.create({
  // Expandido: es un documento que se abre, conserva superficie propia.
  cardExpanded: { backgroundColor: c.surface, borderRadius: radius.xl, overflow: 'hidden', marginVertical: space[1], ...(c.isDark ? {} : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }) },
  // Colapsado: fila plana sobre el fondo de la pantalla.
  rowCollapsed: { backgroundColor: 'transparent' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: space[4], gap: space[3] },
  docIcon: { width: space[8], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  meta: { fontSize: text.xs, color: c.textFaint },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: text.xs, fontWeight: weight.bold },
  horseBadge: { borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3, backgroundColor: c.surfaceAlt },
  horseText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },
  signedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginBottom: space[3], backgroundColor: c.successSoft, borderRadius: radius.md, padding: space[3] },
  signedText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.success },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginBottom: space[3], backgroundColor: c.warningSoft, borderRadius: radius.md, padding: space[3] },
  pendingText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.warning },
  signBlock: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2] },
  signBlockLabel: { fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint, letterSpacing: 0.8, marginBottom: space[3] },
  signRow: { flexDirection: 'row', gap: space[3] },
  signCell: { flex: 1 },
  signImg: { width: '100%', height: 64, backgroundColor: c.surfaceAlt, borderRadius: radius.sm },
  signLine: { height: 1, backgroundColor: c.borderStrong, marginTop: 2, marginBottom: space[2] },
  signName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  signRole: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },
  rejectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginBottom: space[3], backgroundColor: c.dangerSoft, borderRadius: radius.md, padding: space[3] },
  rejectedText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.danger },
  body: { borderTopWidth: 1, borderTopColor: c.border },
  bodyScroll: { maxHeight: 200, padding: space[4] },
  bodyText: { fontSize: text.base, color: c.text, lineHeight: 23 },
  actions: { flexDirection: 'row', gap: space[3], padding: space[4], paddingTop: space[3] },
  signBtn: { flex: 1, height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.success, alignItems: 'center' },
  signBtnText: { fontSize: text.md, fontWeight: weight.extrabold, color: colors.white },
  rejectBtn: { flex: 1, height: touch.button, justifyContent: 'center', borderRadius: radius.lg, backgroundColor: c.surfaceAlt, alignItems: 'center' },
  rejectBtnText: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  deleteBtn: { margin: space[4], marginTop: 0, borderRadius: radius.md, backgroundColor: c.surfaceAlt, paddingVertical: space[3], alignItems: 'center' },
  deleteBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
});

import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileText, ChevronDown } from 'lucide-react-native';
import { PressableScale } from '../../components/PressableScale';
import { useContracts, useCreateContract, useSignContract, useRejectContract, useDeleteContract, useLookupUserByEmail, type Contract } from '../../hooks/use-contracts';
import { useAuth } from '../../lib/auth';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { space, text, radius, weight } from '../../styles/tokens';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', signed: 'Firmado', rejected: 'Rechazado',
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: '#fffbeb', text: '#b45309' },
  signed:   { bg: '#f0fdf4', text: '#15803d' },
  rejected: { bg: '#fef2f2', text: '#b91c1c' },
};

const DEFAULT_BODY = `CONTRATO DE PENSIÓN EQUINA

Entre el establecimiento y el propietario, se acuerda:

1. El caballo quedará alojado en las instalaciones del establecimiento.
2. El propietario se compromete al pago mensual según lo acordado.
3. El establecimiento proveerá alimentación, veterinaria básica y cuidados diarios.
4. Gastos extraordinarios serán consultados previamente con el propietario.
5. El contrato tiene duración mínima de 3 meses, renovable automáticamente.

Firmado digitalmente en HandicApp.`;

function ContractCard({
  contract, userId, role, onSign, onReject, onDelete,
}: {
  contract: Contract; userId: string; role: string;
  onSign: (c: Contract) => void;
  onReject: (c: Contract) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_COLORS[contract.status] ?? STATUS_COLORS.pending;
  const isOwner = contract.owner_id === userId;
  const isEstab = contract.establishment_id === userId;
  const dateStr = new Date(contract.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <View style={cStyles.card}>
      <TouchableOpacity onPress={() => setExpanded((p) => !p)} activeOpacity={0.7} style={cStyles.cardHeader}>
        <View style={cStyles.docIcon}>
          <FileText size={22} color={colors.gray900} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={cStyles.title} numberOfLines={1}>{contract.title}</Text>
          <Text style={cStyles.meta} numberOfLines={1}>
            {isOwner ? `De ${contract.establishment?.name}` : `Para ${contract.owner?.name}`} · {dateStr}
          </Text>
          <View style={cStyles.tagRow}>
            <View style={[cStyles.statusBadge, { backgroundColor: sc.bg }]}>
              <View style={[cStyles.statusDot, { backgroundColor: sc.text }]} />
              <Text style={[cStyles.statusText, { color: sc.text }]}>{STATUS_LABEL[contract.status]}</Text>
            </View>
            {contract.horse && (
              <View style={cStyles.horseBadge}>
                <Text style={cStyles.horseText}>{contract.horse.name}</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronDown
          size={18}
          color={colors.gray300}
          strokeWidth={2}
          style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {contract.status === 'signed' && contract.signed_name && (
        <View style={cStyles.signedBanner}>
          <Text style={cStyles.signedText}>
            ✓ Firmado por {contract.signed_name} · {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
          </Text>
        </View>
      )}
      {contract.status === 'rejected' && contract.rejection_reason && (
        <View style={cStyles.rejectedBanner}>
          <Text style={cStyles.rejectedText}>✕ Motivo: {contract.rejection_reason}</Text>
        </View>
      )}

      {expanded && (
        <View style={cStyles.body}>
          <ScrollView style={cStyles.bodyScroll} nestedScrollEnabled>
            <Text style={cStyles.bodyText}>{contract.body}</Text>
          </ScrollView>

          {isOwner && contract.status === 'pending' && (
            <View style={cStyles.actions}>
              <PressableScale style={cStyles.rejectBtn} onPress={() => onReject(contract)}>
                <Text style={cStyles.rejectBtnText}>Rechazar</Text>
              </PressableScale>
              <PressableScale style={cStyles.signBtn} onPress={() => onSign(contract)}>
                <Text style={cStyles.signBtnText}>Firmar</Text>
              </PressableScale>
            </View>
          )}
          {isEstab && contract.status === 'pending' && (
            <TouchableOpacity
              style={cStyles.deleteBtn}
              onPress={() => Alert.alert('Cancelar contrato', '¿Querés cancelar este contrato?', [
                { text: 'No', style: 'cancel' },
                { text: 'Sí, cancelar', style: 'destructive', onPress: () => onDelete(contract.id) },
              ])}
              activeOpacity={0.8}
            >
              <Text style={cStyles.deleteBtnText}>Cancelar contrato</Text>
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
  const { data: contracts, isLoading, refetch, isRefetching } = useContracts();
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

  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [signedName, setSignedName] = useState('');
  const [rejectingContract, setRejectingContract] = useState<Contract | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isEstab = user?.role === 'establecimiento' || user?.role === 'admin';

  const pending = contracts?.filter((c) => c.status === 'pending') ?? [];
  const others = contracts?.filter((c) => c.status !== 'pending') ?? [];

  const header = (
    <ScreenHeader
      scrollable
      title="Contratos"
      showBack
      right={isEstab ? (
        <TouchableOpacity onPress={() => { haptic.medium(); setShowCreate(true); }} style={s.addBtn} activeOpacity={0.8}>
          <Text style={s.addBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      ) : undefined}
    />
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        {header}
        <View style={s.body}>
          {isLoading && pending.length === 0 && others.length === 0 ? (
            <View style={{ gap: space[3] }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={cStyles.card}>
                  <View style={cStyles.cardHeader}>
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
                  {pending.map((c, index) => (
                    <Animated.View key={c.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <ContractCard contract={c} userId={user?.id ?? ''} role={user?.role ?? ''}
                        onSign={setSigningContract} onReject={setRejectingContract} onDelete={(id) => deleteContract.mutate(id)} />
                    </Animated.View>
                  ))}
                </View>
              )}
              {others.length > 0 && (
                <View style={s.group}>
                  <Text style={s.groupLabel}>HISTORIAL</Text>
                  {others.map((c, index) => (
                    <Animated.View key={c.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <ContractCard contract={c} userId={user?.id ?? ''} role={user?.role ?? ''}
                        onSign={setSigningContract} onReject={setRejectingContract} onDelete={(id) => deleteContract.mutate(id)} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modal crear contrato */}
      <Modal visible={showCreate} animationType="fade" transparent onRequestClose={() => setShowCreate(false)} statusBarTranslucent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={s.modalCard} entering={SlideInDown.springify().damping(20).stiffness(170)}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Nuevo contrato</Text>
              <TouchableOpacity onPress={() => { setShowCreate(false); setEmailToSearch(''); setCreateOwnerEmail(''); }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
              {/* Buscar propietario por email */}
              <Text style={s.fieldLabel}>Email del propietario *</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={createOwnerEmail}
                  onChangeText={setCreateOwnerEmail}
                  placeholder="propietario@email.com"
                  placeholderTextColor="#9ca3af"
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
                    <Text style={s.userFoundIcon}>✓</Text>
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
              <TextInput style={s.input} value={createTitle} onChangeText={setCreateTitle} placeholderTextColor="#9ca3af" />
              <Text style={[s.fieldLabel, { marginTop: 10 }]}>Cuerpo del contrato *</Text>
              <TextInput
                style={[s.input, { height: 180, textAlignVertical: 'top', paddingTop: 10 }]}
                value={createBody} onChangeText={setCreateBody} multiline placeholderTextColor="#9ca3af"
              />
              <Text style={s.hint}>El propietario podrá firmar o rechazar el contrato desde su app.</Text>
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => { setShowCreate(false); setEmailToSearch(''); setCreateOwnerEmail(''); }}>
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
                  setEmailToSearch('');
                  setCreateOwnerEmail('');
                  setCreateTitle('Contrato de Pensión');
                  setCreateBody(DEFAULT_BODY);
                }}
                activeOpacity={0.85}
              >
                {createContract.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.submitBtnText}>Crear contrato</Text>
                }
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal firmar */}
      <Modal visible={!!signingContract} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[s.modalCard, { maxHeight: '50%' }]} entering={SlideInDown.springify().damping(20).stiffness(170)}>
            <View style={[s.modalHeader, { backgroundColor: '#16a34a' }]}>
              <Text style={[s.modalTitle, { color: colors.white }]}>Firmar digitalmente</Text>
              <TouchableOpacity onPress={() => setSigningContract(null)}><Text style={[s.modalClose, { color: 'rgba(255,255,255,0.7)' }]}>✕</Text></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>Escribí tu nombre completo tal como aparecerá en la firma:</Text>
              <TextInput
                style={s.input} value={signedName} onChangeText={setSignedName}
                placeholder="Tu nombre completo" placeholderTextColor="#9ca3af"
                autoCapitalize="words"
              />
              <Text style={s.hint}>Al confirmar, la firma quedará registrada con fecha y hora.</Text>
            </View>
            <View style={s.modalFooter}>
              <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setSigningContract(null)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.signSubmitBtn, { flex: 1 }, (!signedName.trim() || signContract.isPending) && { opacity: 0.5 }]}
                disabled={!signedName.trim() || signContract.isPending}
                onPress={async () => {
                  if (!signingContract) return;
                  await signContract.mutateAsync({ id: signingContract.id, signed_name: signedName.trim() });
                  haptic.success();
                  setSigningContract(null);
                  setSignedName('');
                }}
                activeOpacity={0.85}
              >
                {signContract.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.submitBtnText}>Confirmar firma</Text>
                }
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal rechazar */}
      <Modal visible={!!rejectingContract} animationType="fade" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[s.modalCard, { maxHeight: '50%' }]} entering={SlideInDown.springify().damping(20).stiffness(170)}>
            <View style={[s.modalHeader, { backgroundColor: colors.red500 }]}>
              <Text style={[s.modalTitle, { color: colors.white }]}>Rechazar contrato</Text>
              <TouchableOpacity onPress={() => setRejectingContract(null)}><Text style={[s.modalClose, { color: 'rgba(255,255,255,0.7)' }]}>✕</Text></TouchableOpacity>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>Motivo del rechazo (opcional):</Text>
              <TextInput
                style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={rejectReason} onChangeText={setRejectReason}
                placeholder="Indicá el motivo..." placeholderTextColor="#9ca3af"
                multiline
              />
            </View>
            <View style={s.modalFooter}>
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
                  setRejectReason('');
                }}
                activeOpacity={0.85}
              >
                {rejectContract.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.submitBtnText}>Confirmar rechazo</Text>
                }
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: space[2] },
  backBtnText: { fontSize: 28, color: colors.brand, lineHeight: 32, marginTop: -2 },
  headerTitle: { flex: 1, fontSize: text.lg, fontWeight: weight.extrabold, color: colors.gray900 },
  addBtn: { borderRadius: radius.md, backgroundColor: colors.brand, paddingHorizontal: space[3], paddingVertical: space[2] },
  addBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  content: { paddingBottom: space[10] },
  body: { paddingHorizontal: space[4], paddingTop: space[2], gap: space[4] },
  empty: { alignItems: 'center', paddingVertical: space[10], gap: space[3] },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray700 },
  emptyMsg: { fontSize: text.sm, color: colors.gray400, textAlign: 'center', paddingHorizontal: space[6] },
  group: { gap: space[3] },
  groupLabel: { fontSize: text.xs, fontWeight: weight.bold, color: colors.gray400, letterSpacing: 0.8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[5], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  modalTitle: { fontSize: text.base, fontWeight: weight.extrabold, color: colors.gray900 },
  modalClose: { fontSize: 18, color: colors.gray400 },
  modalBody: { padding: space[5], gap: space[2] },
  modalFooter: { flexDirection: 'row', gap: space[3], padding: space[4], borderTopWidth: 1, borderTopColor: colors.gray100 },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.sm, color: colors.gray900, backgroundColor: colors.gray50 },
  hint: { fontSize: text.xs, color: colors.gray400, marginTop: space[2] },
  cancelBtn: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, paddingVertical: space[3] + 1, alignItems: 'center' },
  cancelBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray600 },
  submitBtn: { borderRadius: radius.md, backgroundColor: colors.brand, paddingVertical: space[3] + 1, alignItems: 'center' },
  submitBtnText: { fontSize: text.sm, fontWeight: weight.extrabold, color: colors.white },
  signSubmitBtn: { borderRadius: radius.md, backgroundColor: '#16a34a', paddingVertical: space[3] + 1, alignItems: 'center' },
  rejectSubmitBtn: { borderRadius: radius.md, backgroundColor: colors.red500, paddingVertical: space[3] + 1, alignItems: 'center' },
  searchBtn: { borderRadius: radius.md, backgroundColor: colors.brand, paddingHorizontal: space[4], paddingVertical: space[3], justifyContent: 'center', alignItems: 'center', minWidth: 70 },
  searchBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  userFound: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fdf4', borderRadius: radius.md, padding: space[3], marginTop: space[2] },
  userFoundIcon: { fontSize: 18, color: '#16a34a' },
  userFoundName: { fontSize: text.sm, fontWeight: weight.bold, color: '#15803d' },
  userFoundRole: { fontSize: text.xs, color: '#16a34a', textTransform: 'capitalize' },
  userNotFound: { backgroundColor: '#fef2f2', borderRadius: radius.md, padding: space[3], marginTop: space[2] },
  userNotFoundText: { fontSize: text.xs, color: '#b91c1c' },
});

const cStyles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: space[4], gap: space[3] },
  docIcon: { width: 30, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  meta: { fontSize: text.xs, color: colors.gray400 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: text.xs, fontWeight: weight.bold },
  horseBadge: { borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3, backgroundColor: colors.gray100 },
  horseText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray700 },
  signedBanner: { marginHorizontal: space[4], marginBottom: space[3], backgroundColor: '#f0fdf4', borderRadius: radius.md, padding: space[3] },
  signedText: { fontSize: text.xs, fontWeight: weight.semibold, color: '#15803d' },
  rejectedBanner: { marginHorizontal: space[4], marginBottom: space[3], backgroundColor: '#fef2f2', borderRadius: radius.md, padding: space[3] },
  rejectedText: { fontSize: text.xs, fontWeight: weight.semibold, color: '#b91c1c' },
  body: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  bodyScroll: { maxHeight: 200, padding: space[4] },
  bodyText: { fontSize: text.sm, color: colors.gray700, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: space[3], padding: space[4], paddingTop: space[3] },
  signBtn: { flex: 1, borderRadius: radius.lg, backgroundColor: '#16a34a', paddingVertical: space[3] + 2, alignItems: 'center' },
  signBtnText: { fontSize: text.sm, fontWeight: weight.extrabold, color: colors.white },
  rejectBtn: { flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200, paddingVertical: space[3] + 2, alignItems: 'center' },
  rejectBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  deleteBtn: { margin: space[4], marginTop: 0, borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, paddingVertical: space[3], alignItems: 'center' },
  deleteBtnText: { fontSize: text.sm, fontWeight: weight.medium, color: colors.gray500 },
});

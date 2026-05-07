import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  RefreshControl, Modal, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { useHorses } from '../hooks/use-horses';
import { useAuth } from '../lib/auth';
import { useBoardingRequests, useCreateBoardingRequest } from '../hooks/use-boarding-requests';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';

interface DirectorioItem {
  id: string;
  name: string;
  horse_count: number;
}

function useDirectorio(search: string) {
  return useQuery<DirectorioItem[]>({
    queryKey: ['directorio', search],
    queryFn: async () => {
      const url = search ? `/auth/directorio?search=${encodeURIComponent(search)}` : '/auth/directorio';
      return (await api.get(url)).data;
    },
    staleTime: 60_000,
  });
}

function RequestModal({
  establishment,
  onClose,
}: {
  establishment: DirectorioItem;
  onClose: () => void;
}) {
  const { data: horses } = useHorses();
  const { data: requests } = useBoardingRequests();
  const create = useCreateBoardingRequest();
  const [horseId, setHorseId] = useState('');
  const [message, setMessage] = useState('');

  const alreadyRequested = (hId: string) =>
    requests?.some((r) => r.horse_id === hId && r.establishment_id === establishment.id && r.status === 'pending');

  const available = (horses ?? []).filter((h) => h.establishment_id !== establishment.id);

  const handleSubmit = async () => {
    if (!horseId) return;
    await create.mutateAsync({
      horse_id: horseId,
      establishment_id: establishment.id,
      message: message.trim() || undefined,
    });
    haptic.success();
    Alert.alert(
      '¡Solicitud enviada!',
      `${establishment.name} recibirá una notificación y podrá aceptar o rechazar tu solicitud.`,
      [{ text: 'Entendido', onPress: onClose }]
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalSheet}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Solicitar alojamiento</Text>
            <TouchableOpacity onPress={onClose}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={s.modalDesc}>
              Enviás una solicitud a{' '}
              <Text style={{ fontWeight: weight.bold }}>{establishment.name}</Text>{' '}
              para alojar uno de tus caballos.
            </Text>

            <Text style={s.fieldLabel}>Caballo *</Text>
            {!available.length ? (
              <Text style={s.emptyText}>No tenés caballos disponibles para alojar en este establecimiento.</Text>
            ) : (
              <View style={s.horseList}>
                {available.map((h) => {
                  const pending = alreadyRequested(h.id);
                  return (
                    <TouchableOpacity
                      key={h.id}
                      style={[s.horseItem, horseId === h.id && s.horseItemActive, pending && { opacity: 0.5 }]}
                      onPress={() => { if (!pending) { haptic.selection(); setHorseId(h.id); } }}
                      activeOpacity={0.75}
                      disabled={!!pending}
                    >
                      <Text style={[s.horseItemText, horseId === h.id && s.horseItemTextActive]}>
                        {h.name}{pending ? ' (pendiente)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <Text style={[s.fieldLabel, { marginTop: 14 }]}>Mensaje (opcional)</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Presentate brevemente..."
              placeholderTextColor={colors.gray400}
              multiline
            />
          </ScrollView>

          <View style={s.modalFooter}>
            <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={onClose}>
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { flex: 1 }, (!horseId || !available.length || create.isPending) && { opacity: 0.5 }]}
              disabled={!horseId || !available.length || create.isPending}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              {create.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnPrimaryText}>Enviar solicitud</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function DirectorioScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [requesting, setRequesting] = useState<DirectorioItem | null>(null);
  const { data, isLoading, refetch, isRefetching } = useDirectorio(debouncedSearch);
  const { data: myRequests } = useBoardingRequests();

  const isPropietario = user?.role === 'propietario';

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((global as any).__dirTimer);
    (global as any).__dirTimer = setTimeout(() => setDebouncedSearch(v), 400);
  };

  const pendingForEstab = (estabId: string) =>
    myRequests?.some((r) => r.establishment_id === estabId && r.status === 'pending');

  const pendingRequests = myRequests?.filter((r) => r.status === 'pending') ?? [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Directorio" showBack />

      {/* Solicitudes pendientes propias */}
      {isPropietario && pendingRequests.length > 0 && (
        <View style={s.pendingBanner}>
          <Ionicons name="time-outline" size={14} color="#92400e" />
          <Text style={s.pendingText}>
            {pendingRequests.length} solicitud{pendingRequests.length !== 1 ? 'es' : ''} pendiente{pendingRequests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Buscador */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.gray400} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar establecimiento..."
          placeholderTextColor={colors.gray400}
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); haptic.selection(); }}>
            <Ionicons name="close-circle" size={16} color={colors.gray300} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <View style={s.spinner} />
        </View>
      ) : !data?.length ? (
        <EmptyState
          icon="business-outline"
          title={search ? 'Sin resultados' : 'Sin establecimientos'}
          message={search ? `No encontramos resultados para "${search}".` : 'No hay establecimientos registrados.'}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => d.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasPending = pendingForEstab(item.id);
            return (
              <View style={s.card}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{item.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{item.name}</Text>
                  <Text style={s.cardSub}>
                    {item.horse_count === 0
                      ? 'Sin caballos alojados'
                      : `${item.horse_count} caballo${item.horse_count !== 1 ? 's' : ''} en pensión`}
                  </Text>
                </View>
                {isPropietario && (
                  hasPending ? (
                    <View style={s.pendingChip}>
                      <Text style={s.pendingChipText}>Pendiente</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.requestBtn}
                      onPress={() => { haptic.medium(); setRequesting(item); }}
                      activeOpacity={0.8}
                    >
                      <Text style={s.requestBtnText}>Solicitar</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        />
      )}

      {requesting && <RequestModal establishment={requesting} onClose={() => setRequesting(null)} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f3f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  spinner: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: colors.gray200, borderTopColor: colors.primary },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginTop: space[3], backgroundColor: '#fffbeb', borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[2], borderWidth: 1, borderColor: '#fde68a' },
  pendingText: { fontSize: text.xs, fontWeight: weight.semibold, color: '#92400e' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginHorizontal: space[4], marginVertical: space[3], backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: space[3], paddingVertical: 2 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: text.sm, color: colors.gray900 },
  list: { paddingHorizontal: space[4], paddingBottom: space[8] },
  card: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: '#e8edf5', padding: space[4], shadowColor: '#0f1f3d', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: text.lg, fontWeight: weight.bold, color: colors.white },
  cardName: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  cardSub: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  requestBtn: { borderRadius: radius.md, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 7 },
  requestBtnText: { fontSize: 11, fontWeight: weight.bold, color: colors.white },
  pendingChip: { borderRadius: radius.full, backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#fde68a' },
  pendingChipText: { fontSize: 10, fontWeight: weight.semibold, color: '#92400e' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[5], borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  modalTitle: { fontSize: text.base, fontWeight: weight.bold, color: colors.gray900 },
  modalClose: { fontSize: 18, color: colors.gray400 },
  modalBody: { padding: space[5], gap: space[3] },
  modalDesc: { fontSize: text.sm, color: colors.gray500, lineHeight: 20 },
  modalFooter: { flexDirection: 'row', gap: space[3], padding: space[4], borderTopWidth: 1, borderTopColor: colors.gray100 },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  emptyText: { fontSize: text.xs, color: colors.gray400 },
  horseList: { gap: 8 },
  horseItem: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: colors.white },
  horseItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  horseItemText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  horseItemTextActive: { color: colors.white },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.sm, color: colors.gray900, backgroundColor: colors.gray50 },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  btnSecondary: { borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white },
  btnSecondaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray600 },
});

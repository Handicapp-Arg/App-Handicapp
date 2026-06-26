import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
  RefreshControl, Modal, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Clock, Search, XCircle, X } from 'lucide-react-native';
import api from '../../lib/api';
import { useHorses } from '../../hooks/use-horses';
import { useAuth } from '../../lib/auth';
import { useBoardingRequests, useCreateBoardingRequest } from '../../hooks/use-boarding-requests';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Routes } from '../../lib/routes';
import { EmptyState } from '../../components/EmptyState';
import { ListRowSkeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight } from '../../styles/tokens';

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
  c,
  s,
}: {
  establishment: DirectorioItem;
  onClose: () => void;
  c: ThemeColors;
  s: Styles;
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
    <Modal visible animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={s.modalSheet} entering={SlideInDown.springify().damping(20).stiffness(170)}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Solicitar alojamiento</Text>
            <TouchableOpacity onPress={onClose}><X size={22} color={c.textFaint} strokeWidth={2} /></TouchableOpacity>
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
              placeholderTextColor={c.textFaint}
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function DirectorioScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
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

  const ListHeader = (
    <>
      <ScreenHeader scrollable title="Directorio" showBack backTo={Routes.mas} />

      {/* Solicitudes pendientes propias */}
      {isPropietario && pendingRequests.length > 0 && (
        <View style={s.pendingBanner}>
          <Clock size={14} color="#92400e" strokeWidth={2} />
          <Text style={s.pendingText}>
            {pendingRequests.length} solicitud{pendingRequests.length !== 1 ? 'es' : ''} pendiente{pendingRequests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Buscador */}
      <View style={s.searchWrap}>
        <Search size={16} color={c.textFaint} strokeWidth={2} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar establecimiento..."
          placeholderTextColor={c.textFaint}
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); haptic.selection(); }}>
            <XCircle size={16} color={c.textFaint} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {isLoading ? (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {ListHeader}
          <View style={s.itemWrap}>
            {Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <EmptyState
              icon="business-outline"
              title={search ? 'Sin resultados' : 'Sin establecimientos'}
              message={search ? `No encontramos resultados para "${search}".` : 'No hay establecimientos registrados.'}
            />
          }
          renderItem={({ item, index }) => {
            const hasPending = pendingForEstab(item.id);
            return (
              <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={[s.itemWrap, s.card]}>
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
              </Animated.View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        />
      )}

      {requesting && <RequestModal establishment={requesting} onClose={() => setRequesting(null)} c={c} s={s} />}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  spinner: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: c.borderStrong, borderTopColor: c.brand },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginTop: space[3], backgroundColor: '#fffbeb', borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[2], borderWidth: 1, borderColor: '#fde68a' },
  pendingText: { fontSize: text.xs, fontWeight: weight.semibold, color: '#92400e' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginHorizontal: space[4], marginVertical: space[3], backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: space[3], paddingVertical: 2 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: text.sm, color: c.text },
  list: { paddingBottom: space[8] },
  itemWrap: { marginHorizontal: space[4] },
  card: { flexDirection: 'row', alignItems: 'center', gap: space[3], backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.borderStrong, padding: space[4], shadowColor: '#0f1f3d', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  avatar: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  cardName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  cardSub: { fontSize: text.xs, color: c.textFaint, marginTop: 2 },
  requestBtn: { borderRadius: radius.md, backgroundColor: c.brand, paddingHorizontal: 12, paddingVertical: 7 },
  requestBtnText: { fontSize: 11, fontWeight: weight.bold, color: colors.white },
  pendingChip: { borderRadius: radius.full, backgroundColor: '#fffbeb', paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#fde68a' },
  pendingChipText: { fontSize: 10, fontWeight: weight.semibold, color: '#92400e' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: space[5], borderBottomWidth: 1, borderBottomColor: c.border },
  modalTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  modalClose: { fontSize: 18, color: c.textFaint },
  modalBody: { padding: space[5], gap: space[3] },
  modalDesc: { fontSize: text.sm, color: c.textMuted, lineHeight: 20 },
  modalFooter: { flexDirection: 'row', gap: space[3], padding: space[4], borderTopWidth: 1, borderTopColor: c.border },
  fieldLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  emptyText: { fontSize: text.xs, color: c.textFaint },
  horseList: { gap: 8 },
  horseItem: { borderRadius: radius.md, borderWidth: 1, borderColor: c.borderStrong, paddingHorizontal: space[4], paddingVertical: space[3], backgroundColor: c.surface },
  horseItemActive: { backgroundColor: c.brand, borderColor: c.brand },
  horseItemText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  horseItemTextActive: { color: colors.white },
  input: { borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[3], fontSize: text.sm, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  btnSecondary: { borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface },
  btnSecondaryText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted },
});

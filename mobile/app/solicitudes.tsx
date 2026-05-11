import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';
import {
  useBoardingRequests, useAcceptBoardingRequest, useRejectBoardingRequest,
  type BoardingRequest,
} from '../hooks/use-boarding-requests';
import { haptic } from '../lib/haptics';

type Filter = 'pending' | 'accepted' | 'rejected';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending',  label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

const STATUS_META: Record<Filter, { bg: string; text: string; label: string }> = {
  pending:  { bg: colors.amber50,   text: colors.amber600,   label: 'Pendiente' },
  accepted: { bg: colors.emerald50, text: colors.emerald700, label: 'Aceptada' },
  rejected: { bg: colors.red50,     text: colors.red700,     label: 'Rechazada' },
};

function RequestRow({
  req, onAccept, onReject, pending,
}: { req: BoardingRequest; onAccept: () => void; onReject: () => void; pending: boolean }) {
  const status = STATUS_META[req.status];
  const isPending = req.status === 'pending';

  return (
    <View style={s.row}>
      <View style={s.rowHead}>
        <Text style={s.horseName} numberOfLines={1}>
          {req.horse?.name ?? 'Caballo'}
        </Text>
        <View style={[s.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[s.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>
      <Text style={s.requester} numberOfLines={1}>
        {req.requester?.name ?? 'Solicitante'} <Text style={s.muted}>· {req.requester?.email ?? ''}</Text>
      </Text>
      {req.message && (
        <Text style={s.message} numberOfLines={3}>“{req.message}”</Text>
      )}
      <Text style={s.date}>
        {new Date(req.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
      {isPending && (
        <View style={s.actions}>
          <TouchableOpacity
            onPress={onReject}
            disabled={pending}
            style={[s.actionBtn, s.actionReject, pending && s.actionDisabled]}
            activeOpacity={0.8}
          >
            <Text style={s.actionRejectText}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAccept}
            disabled={pending}
            style={[s.actionBtn, s.actionAccept, pending && s.actionDisabled]}
            activeOpacity={0.85}
          >
            <Text style={s.actionAcceptText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function SolicitudesScreen() {
  const [filter, setFilter] = useState<Filter>('pending');
  const { data, isLoading, isError, refetch, isRefetching } = useBoardingRequests();
  const accept = useAcceptBoardingRequest();
  const reject = useRejectBoardingRequest();

  const filtered = (data ?? []).filter((r) => r.status === filter);

  const handleAccept = (id: string, name: string) => {
    Alert.alert('Aceptar solicitud', `Confirmar el alojamiento de "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Aceptar', onPress: () => {
          haptic.light();
          accept.mutate(id);
        },
      },
    ]);
  };

  const handleReject = (id: string, name: string) => {
    Alert.alert('Rechazar solicitud', `Rechazar el alojamiento de "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive', onPress: () => {
          haptic.light();
          reject.mutate(id);
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <ScreenHeader title="Solicitudes" subtitle="Pensión de caballos" showBack />

      <View style={s.tabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[s.tab, filter === f.value && s.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, filter === f.value && s.tabTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} /></View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="No pudimos cargar las solicitudes"
          message="Tocá para reintentar."
          actionLabel="Reintentar"
          onAction={() => refetch()}
          tint={colors.red500}
        />
      ) : !filtered.length ? (
        <EmptyState
          icon="document-text-outline"
          title={`Sin solicitudes ${STATUS_META[filter].label.toLowerCase()}s`}
          message={filter === 'pending' ? 'Cuando alguien pida alojar a un caballo, aparecerá acá.' : 'Esta sección está vacía por ahora.'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <RequestRow
              req={item}
              pending={accept.isPending || reject.isPending}
              onAccept={() => handleAccept(item.id, item.horse?.name ?? 'el caballo')}
              onReject={() => handleReject(item.id, item.horse?.name ?? 'el caballo')}
            />
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: {
    flexDirection: 'row',
    padding: space[3],
    gap: space[2],
  },
  tab: {
    flex: 1,
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray100,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: text.sm,
    fontWeight: weight.semibold,
    color: colors.gray500,
  },
  tabTextActive: { color: colors.white },
  list: { padding: space[3], gap: space[3], paddingBottom: space[8] },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.gray100,
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[2],
  },
  horseName: { flex: 1, fontSize: text.md, fontWeight: weight.bold, color: colors.gray900, marginRight: space[2] },
  statusPill: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: text.xs, fontWeight: weight.bold },
  requester: { fontSize: text.sm, color: colors.gray700, marginBottom: space[2] },
  muted: { color: colors.gray400 },
  message: { fontSize: text.sm, color: colors.gray600, fontStyle: 'italic', marginBottom: space[2] },
  date: { fontSize: text.xs, color: colors.gray400 },
  actions: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[3],
  },
  actionBtn: {
    flex: 1,
    paddingVertical: space[3],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionDisabled: { opacity: 0.5 },
  actionReject: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  actionRejectText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  actionAccept: { backgroundColor: colors.primary },
  actionAcceptText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
});

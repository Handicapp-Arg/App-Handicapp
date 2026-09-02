import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../components/ScreenHeader';
import { Routes } from '../lib/routes';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ListRowSkeleton } from '../components/Skeleton';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, touch } from '../styles/tokens';
import {
  useBoardingRequests, useAcceptBoardingRequest, useRejectBoardingRequest,
  type BoardingRequest,
} from '../hooks/use-boarding-requests';
import { haptic } from '../lib/haptics';
import { fechaHumana } from '../lib/fechas';

type Filter = 'pending' | 'accepted' | 'rejected';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending',  label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

// Estados de la solicitud -> semánticos del theme (dark-safe), igual que en contratos.tsx.
const makeStatusMeta = (c: ThemeColors): Record<Filter, { bg: string; text: string; label: string }> => ({
  pending:  { bg: c.warningSoft, text: c.warning, label: 'Pendiente' },
  accepted: { bg: c.successSoft, text: c.success, label: 'Aceptada' },
  rejected: { bg: c.dangerSoft,  text: c.danger,  label: 'Rechazada' },
});

function RequestRow({
  req, onAccept, onReject, pending, s, c,
}: { req: BoardingRequest; onAccept: () => void; onReject: () => void; pending: boolean; s: Styles; c: ThemeColors }) {
  const status = makeStatusMeta(c)[req.status];
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
      <Text style={s.date}>{fechaHumana(req.created_at)}</Text>
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
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

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
      <ScreenHeader title="Solicitudes" subtitle="Pensión de caballos" showBack backTo={Routes.mas} />

      <View style={s.tabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => { haptic.selection(); setFilter(f.value); }}
            style={[s.tab, filter === f.value && s.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, filter === f.value && s.tabTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s.list}>
          {Array.from({ length: 6 }).map((_, i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !filtered.length ? (
        <EmptyState
          icon="document-text-outline"
          title={`Sin solicitudes ${makeStatusMeta(c)[filter].label.toLowerCase()}s`}
          message={filter === 'pending' ? 'Cuando alguien pida alojar a un caballo, aparecerá acá.' : 'Esta sección está vacía por ahora.'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
              <RequestRow
                req={item}
                pending={accept.isPending || reject.isPending}
                onAccept={() => handleAccept(item.id, item.horse?.name ?? 'el caballo')}
                onReject={() => handleReject(item.id, item.horse?.name ?? 'el caballo')}
                s={s}
                c={c}
              />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: {
    flexDirection: 'row',
    padding: space[3],
    gap: space[2],
  },
  tab: {
    flex: 1,
    minHeight: touch.min,
    justifyContent: 'center',
    paddingVertical: space[2],
    borderRadius: radius.md,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: c.brand,
  },
  tabText: {
    fontSize: text.sm,
    fontWeight: weight.semibold,
    color: c.textMuted,
  },
  tabTextActive: { color: colors.white },
  list: { padding: space[3], gap: space[3], paddingBottom: space[8] },
  row: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: space[4],
    ...(c.isDark ? {} : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }),
  },
  rowHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space[2],
  },
  horseName: { flex: 1, fontSize: text.md, fontWeight: weight.bold, color: c.text, marginRight: space[2] },
  statusPill: { paddingHorizontal: space[2], paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: text.xs, fontWeight: weight.bold },
  requester: { fontSize: text.sm, color: c.text, marginBottom: space[2] },
  muted: { color: c.textFaint },
  message: { fontSize: text.sm, color: c.textMuted, fontStyle: 'italic', marginBottom: space[2] },
  date: { fontSize: text.xs, color: c.textFaint },
  actions: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[3],
  },
  actionBtn: {
    flex: 1,
    minHeight: touch.min,
    justifyContent: 'center',
    paddingVertical: space[3],
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionDisabled: { opacity: 0.5 },
  actionReject: { backgroundColor: c.surfaceAlt },
  actionRejectText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  actionAccept: { backgroundColor: c.brand },
  actionAcceptText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
});

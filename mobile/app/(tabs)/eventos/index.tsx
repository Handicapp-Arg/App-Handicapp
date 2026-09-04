import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, RefreshControl,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { useAllEvents, useDeleteEvent } from '../../../hooks/use-events';
import { useAuth } from '../../../lib/auth';
import { EventCard } from '../../../components/EventCard';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { Routes } from '../../../lib/routes';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { EventRowSkeleton } from '../../../components/Skeleton';
import { haptic } from '../../../lib/haptics';
import { colors, makeEventTypeColors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';

const TYPE_OPTIONS = ['salud', 'entrenamiento', 'tarea', 'carrera', 'gasto', 'nota'] as const;

// Gating por rol en la UI: jinete solo "entrenamiento", peón solo "tarea".
function visibleTypeOptions(role?: string): readonly string[] {
  if (role === 'jinete') return ['entrenamiento'];
  if (role === 'peon') return ['tarea'];
  return TYPE_OPTIONS;
}

export default function EventosScreen() {
  const router = useRouter();
  const { can, user } = useAuth();
  const filterTypeOptions = visibleTypeOptions(user?.role);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const eventTypeColors = makeEventTypeColors(c);
  const { layout, typography } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const [filterType, setFilterType] = useState('');

  const { events, isLoading, isError, isFetchingMore, hasMore, loadMore, reset, refetch, total } = useAllEvents(
    filterType ? { type: filterType } : undefined,
  );
  const deleteEvent = useDeleteEvent();
  const canCreate = can('events', 'create');
  const canDelete = can('events', 'delete');
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  useEffect(() => { reset(); }, [filterType]);

  const irANuevo = () => { haptic.medium(); router.push(Routes.eventoNuevo as never); };

  const headerChrome = (
    <>
      <ScreenHeader
        scrollable
        showBack
        backTo={Routes.mas}
        title={total > 0 ? `Eventos (${total})` : 'Eventos'}
        right={canCreate ? (
          <HeaderButton label="+ Nuevo" onPress={irANuevo} />
        ) : undefined}
      />

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
        style={{ maxHeight: 48 }}
      >
        {(['', ...filterTypeOptions] as string[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.filterChip, filterType === t && s.filterChipActive]}
            onPress={() => { haptic.selection(); setFilterType(t); }}
          >
            <Text style={[s.filterChipText, filterType === t && s.filterChipTextActive]}>
              {t === '' ? 'Todos' : eventTypeColors[t]?.label ?? t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contador */}
      {total > 0 && (
        <Text style={s.counter}>{events.length} de {total}</Text>
      )}
    </>
  );

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>

      {/* Lista */}
      {isError && events.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {headerChrome}
          <ErrorState onRetry={() => refetch()} />
        </ScrollView>
      ) : isLoading ? (
        <View>
          {headerChrome}
          <View style={{ paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] }}>
            {[1,2,3,4,5].map((i) => <EventRowSkeleton key={i} />)}
          </View>
        </View>
      ) : !events.length ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {headerChrome}
          <EmptyState
            icon={filterType ? 'filter-outline' : 'document-text-outline'}
            title={filterType ? 'Sin eventos de este tipo' : 'Sin eventos registrados'}
            message={filterType
              ? `No hay eventos de "${eventTypeColors[filterType]?.label}". Probá con otro filtro.`
              : 'Los eventos registrados de salud, entrenamiento y gastos aparecerán aquí.'}
            actionLabel={canCreate && !filterType ? 'Crear primer evento' : undefined}
            onAction={irANuevo}
          />
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          ListHeaderComponent={headerChrome}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.border, marginLeft: space[4] }} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ paddingHorizontal: space[4] }}>
              <EventCard
                event={item}
                showHorse
                canEditMetrics={canCreate}
                onDelete={canDelete ? (id) => deleteEvent.mutate(id) : undefined}
              />
            </Animated.View>
          )}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={s.footer}>
                <ActivityIndicator size="small" color={c.brand} />
              </View>
            ) : !hasMore && total > 0 ? (
              <View style={s.footer}>
                <Text style={typography.caption}>— {total} eventos en total —</Text>
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {canCreate && (
        <Pressable
          style={s.fab}
          onPress={irANuevo}
          accessibilityRole="button"
          accessibilityLabel="Nuevo evento"
          hitSlop={8}
        >
          <Plus size={26} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  filterRow: { paddingHorizontal: space[4], paddingVertical: space[2], gap: space[2] },
  filterChip: {
    borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[1] + 2,
    backgroundColor: c.surfaceAlt,
  },
  filterChipActive: { backgroundColor: c.text },
  filterChipText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  filterChipTextActive: { color: c.surface },
  counter: { fontSize: text.xs, color: c.textFaint, paddingHorizontal: space[4], paddingBottom: space[1] },
  list: { paddingBottom: 120 },
  footer: { padding: space[5], alignItems: 'center' },
  fab: {
    position: 'absolute', right: 20, bottom: 110,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.brand, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 4,
  },
});

import { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import {
  HeartPulse, Dumbbell, ClipboardList, Trophy, Receipt, StickyNote, Bell, Trash2, Camera,
} from 'lucide-react-native';
import { useAllEvents, useDeleteEvent } from '../../../hooks/use-events';
import { useAuth } from '../../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { SwipeableRow } from '../../../components/SwipeableRow';
import { BottomSheet } from '../../../components/BottomSheet';
import { AppImage } from '../../../components/AppImage';
import { Routes } from '../../../lib/routes';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { EventRowSkeleton } from '../../../components/Skeleton';
import { haptic } from '../../../lib/haptics';
import { formatCurrency } from '../../../lib/currency';
import { fechaHumana, fechaHoraHumana } from '../../../lib/fechas';
import { makeEventTypeColors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, weight } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';
import type { Event } from '../../../../packages/shared/src';

const TYPE_ICONS: Record<string, typeof HeartPulse> = {
  salud: HeartPulse,
  entrenamiento: Dumbbell,
  tarea: ClipboardList,
  carrera: Trophy,
  gasto: Receipt,
  nota: StickyNote,
  aviso: Bell,
};

type FeedItem =
  | { kind: 'dia'; key: string; label: string }
  | { kind: 'evento'; key: string; event: Event };

/** Feed plano agrupado por día: [encabezado "Hoy", eventos..., "Ayer", ...]. */
function agruparPorDia(events: Event[]): FeedItem[] {
  const items: FeedItem[] = [];
  let ultimoDia = '';
  for (const e of events) {
    const dia = fechaHumana(e.date);
    if (dia !== ultimoDia) {
      items.push({ kind: 'dia', key: `dia-${dia}-${e.id}`, label: dia });
      ultimoDia = dia;
    }
    items.push({ kind: 'evento', key: e.id, event: e });
  }
  return items;
}

export default function EventosScreen() {
  const router = useRouter();
  const { can } = useAuth();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { layout } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const typeLabels = makeEventTypeColors(c);

  const { events, isLoading, isError, isFetchingMore, hasMore, loadMore, refetch } = useAllEvents();
  const deleteEvent = useDeleteEvent();
  const canCreate = can('events', 'create');
  const canDelete = can('events', 'delete');
  const listRef = useRef<FlatList<FeedItem>>(null);
  useScrollToTop(listRef);
  const [detalle, setDetalle] = useState<Event | null>(null);

  const feed = useMemo(() => agruparPorDia(events), [events]);

  const irANuevo = () => { haptic.medium(); router.push(Routes.eventoNuevo as never); };

  const header = (
    <ScreenHeader
      scrollable
      title="Eventos"
      right={canCreate ? <HeaderButton label="Nuevo" onPress={irANuevo} /> : undefined}
    />
  );

  const renderFila = ({ item }: { item: FeedItem }) => {
    if (item.kind === 'dia') {
      return <Text style={s.diaHeader}>{item.label}</Text>;
    }
    const e = item.event;
    const Icon = TYPE_ICONS[e.type] ?? StickyNote;
    const subtitulo = [e.horse?.name, typeLabels[e.type]?.label ?? e.type]
      .filter(Boolean)
      .join(' · ');
    const fila = (
      <Pressable
        style={({ pressed }) => [s.fila, pressed && { backgroundColor: c.surfaceAlt }]}
        onPress={() => { haptic.light(); setDetalle(e); }}
      >
        <View style={s.iconWrap}>
          <Icon size={17} color={c.textMuted} strokeWidth={1.8} />
        </View>
        <View style={s.filaMain}>
          <Text style={s.filaTitulo} numberOfLines={2}>{e.description}</Text>
          <View style={s.filaSubRow}>
            <Text style={s.filaSub} numberOfLines={1}>{subtitulo}</Text>
            {e.photos && e.photos.length > 0 && (
              <Camera size={12} color={c.textFaint} strokeWidth={2} />
            )}
          </View>
        </View>
        {e.amount != null && (
          <Text style={s.filaMonto}>{formatCurrency(e.amount, e.currency ?? 'ARS')}</Text>
        )}
      </Pressable>
    );
    if (!canDelete) return fila;
    return (
      <SwipeableRow
        acciones={[{
          label: 'Eliminar',
          Icon: Trash2,
          color: c.danger,
          onPress: () => deleteEvent.mutate(e.id),
          accessibilityLabel: 'Eliminar evento',
        }]}
      >
        {fila}
      </SwipeableRow>
    );
  };

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>
      {isError && events.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {header}
          <ErrorState onRetry={() => refetch()} />
        </ScrollView>
      ) : isLoading ? (
        <View>
          {header}
          <View style={{ paddingHorizontal: space[4], paddingTop: space[3], gap: space[2] }}>
            {[1, 2, 3, 4, 5].map((i) => <EventRowSkeleton key={i} />)}
          </View>
        </View>
      ) : !events.length ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {header}
          <EmptyState
            icon="document-text-outline"
            title="Sin eventos registrados"
            message="Los eventos de salud, entrenamiento y gastos aparecerán aquí."
            actionLabel={canCreate ? 'Crear primer evento' : undefined}
            onAction={irANuevo}
          />
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          data={feed}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.list}
          ListHeaderComponent={header}
          renderItem={renderFila}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={s.footer}>
                <ActivityIndicator size="small" color={c.brand} />
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detalle del evento: hoja nativa con la info completa */}
      <BottomSheet
        visible={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? (typeLabels[detalle.type]?.label ?? 'Evento') : undefined}
      >
        {detalle && (
          <View style={s.detalle}>
            <Text style={s.detalleDesc}>{detalle.description}</Text>
            <View style={s.detalleFilas}>
              {detalle.horse?.name ? (
                <View style={s.detalleFila}>
                  <Text style={s.detalleLabel}>Caballo</Text>
                  <Text style={s.detalleValor}>{detalle.horse.name}</Text>
                </View>
              ) : null}
              <View style={s.detalleFila}>
                <Text style={s.detalleLabel}>Fecha</Text>
                <Text style={s.detalleValor}>{fechaHoraHumana(detalle.date) || fechaHumana(detalle.date)}</Text>
              </View>
              {detalle.amount != null && (
                <View style={s.detalleFila}>
                  <Text style={s.detalleLabel}>Monto</Text>
                  <Text style={s.detalleValor}>{formatCurrency(detalle.amount, detalle.currency ?? 'ARS')}</Text>
                </View>
              )}
            </View>
            {detalle.photos && detalle.photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
                {detalle.photos.map((ph: any, i: number) => (
                  <AppImage key={i} source={{ uri: typeof ph === 'string' ? ph : ph.url }} style={s.detalleFoto} />
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  diaHeader: {
    fontSize: text.sm, fontWeight: weight.semibold, color: c.textMuted,
    paddingHorizontal: space[4], paddingTop: space[5], paddingBottom: space[2],
  },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    paddingHorizontal: space[4], paddingVertical: space[3],
    backgroundColor: c.bg,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  filaMain: { flex: 1, gap: 2 },
  filaTitulo: { fontSize: text.md, color: c.text, lineHeight: 21 },
  filaSubRow: { flexDirection: 'row', alignItems: 'center', gap: space[1] + 2 },
  filaSub: { fontSize: text.sm, color: c.textFaint, flexShrink: 1 },
  filaMonto: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text, fontVariant: ['tabular-nums'] },
  list: { paddingBottom: 120 },
  detalle: { gap: space[4], paddingBottom: space[2] },
  detalleDesc: { fontSize: text.md, color: c.text, lineHeight: 23 },
  detalleFilas: { gap: 0 },
  detalleFila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  detalleLabel: { fontSize: text.sm, color: c.textFaint },
  detalleValor: { fontSize: text.sm, fontWeight: weight.medium, color: c.text },
  detalleFoto: { width: 96, height: 96, borderRadius: 12 },
  footer: { padding: space[5], alignItems: 'center' },
});

import { useCallback, useMemo, useRef, useState, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, ScrollView, ActivityIndicator,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Trash2, Camera, Plus } from 'lucide-react-native';
import { useAllEvents, useDeleteEvent } from '../../../hooks/use-events';
import { useHorses } from '../../../hooks/use-horses';
import { useAuth } from '../../../lib/auth';
import { SwipeableRow } from '../../../components/SwipeableRow';
import { BottomSheet } from '../../../components/BottomSheet';
import { AppImage } from '../../../components/AppImage';
import { PressableScale } from '../../../components/PressableScale';
import { HorseshoeH } from '../../../components/icons/equine';
import { Routes } from '../../../lib/routes';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { haptic } from '../../../lib/haptics';
import { formatCurrency } from '../../../lib/currency';
import { fechaHumana } from '../../../lib/fechas';
import { makeEventTypeColors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { entradaLista } from '../../../styles/motion';
import type { Event } from '../../../../packages/shared/src';

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

/** Misma silueta que la fila real: miniatura cuadrada + dos líneas de texto. */
function FilaEventoSkeleton({ s }: { s: Styles }) {
  return (
    <View style={s.fila}>
      <Skeleton width={44} height={44} borderRadius={radius.md + 3} />
      <View style={s.filaMain}>
        <Skeleton height={14} width="45%" />
        <Skeleton height={13} width="85%" style={{ marginTop: space[2] }} />
      </View>
    </View>
  );
}

/**
 * Fila de evento memoizada. Vive fuera de `FeedEventos` para que React.memo
 * sirva de algo: dentro del render del padre se redefiniría en cada pasada y
 * cada celda se remontaría entera al scrollear.
 */
const FilaEvento = memo(function FilaEvento({
  e, foto, tipoLabel, canDelete, onPress, onDelete, c, s,
}: {
  e: Event;
  /** Foto del caballo ya resuelta: puede venir del evento o del listado de
   *  caballos, según si el backend desplegado la manda o no. */
  foto?: string | null;
  tipoLabel: string;
  canDelete: boolean;
  onPress: (e: Event) => void;
  onDelete: (id: string) => void;
  c: ThemeColors;
  s: Styles;
}) {
  // Array estable de acciones: ver SwipeableRow.
  const acciones = useMemo(() => [{
    label: 'Eliminar',
    Icon: Trash2,
    color: c.danger,
    onPress: () => onDelete(e.id),
    accessibilityLabel: 'Eliminar evento',
  }], [c.danger, e.id, onDelete]);

  const fila = (
    <PressableScale
      style={s.fila}
      onPress={() => { haptic.light(); onPress(e); }}
      accessibilityRole="button"
      accessibilityLabel={`Evento de ${e.horse?.name ?? 'caballo'}`}
    >
      {foto ? (
        <AppImage source={{ uri: foto }} style={s.filaFoto} />
      ) : (
        <View style={[s.filaFoto, s.filaFotoVacia]}>
          <HorseshoeH size={22} color={c.textFaint} />
        </View>
      )}

      <View style={s.filaMain}>
        <View style={s.filaHead}>
          {e.horse?.name ? <Text style={s.filaNombre} numberOfLines={1}>{e.horse.name}</Text> : null}
          <Text style={s.filaTipo} numberOfLines={1}>{tipoLabel}</Text>
          {e.photos && e.photos.length > 0 && (
            <Camera size={12} color={c.textFaint} strokeWidth={2} />
          )}
        </View>
        <Text style={s.filaDesc} numberOfLines={2}>{e.description}</Text>
        {e.amount != null && (
          <Text style={s.filaMonto}>{formatCurrency(e.amount, e.currency ?? 'ARS')}</Text>
        )}
      </View>
    </PressableScale>
  );

  return canDelete ? <SwipeableRow acciones={acciones}>{fila}</SwipeableRow> : fila;
});

/**
 * El feed vive en su propio componente y el padre lo remonta con `key` cuando
 * cambia el filtro de caballo. `useAllEvents` acumula páginas en estado
 * interno: sin remontar, al filtrar se mezclarían los eventos del caballo
 * anterior con los del nuevo.
 */
function FeedEventos({ horseId, c, s }: { horseId: string; c: ThemeColors; s: Styles }) {
  const router = useRouter();
  const { can } = useAuth();
  // Se recalculaba en cada render y se leía una vez por fila.
  const typeLabels = useMemo(() => makeEventTypeColors(c), [c]);
  const params = useMemo(() => (horseId ? { horse_id: horseId } : undefined), [horseId]);
  const { events, isLoading, isError, isFetchingMore, hasMore, loadMore, refetch } = useAllEvents(params);
  const deleteEvent = useDeleteEvent();
  const canCreate = can('events', 'create');
  const canDelete = can('events', 'delete');
  const listRef = useRef<FlatList<FeedItem>>(null);
  useScrollToTop(listRef);
  const [detalle, setDetalle] = useState<Event | null>(null);

  const feed = useMemo(() => agruparPorDia(events), [events]);

  /**
   * Respaldo de fotos. El listado de eventos del servidor desplegado todavía no
   * manda `image_url` del caballo (ya está arreglado en el código, falta subirlo),
   * así que mientras tanto se cruza contra el listado de caballos, que la app ya
   * tiene cacheado. Cuando el backend la mande, gana la del evento.
   */
  const { data: caballos } = useHorses();
  const fotosPorCaballo = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const h of caballos ?? []) m[h.id] = h.image_url;
    return m;
  }, [caballos]);
  const irANuevo = () => { haptic.medium(); router.push(Routes.eventoNuevo as never); };

  // Callbacks estables: sin esto cada fila recibía funciones nuevas en cada
  // render del feed y React.memo no podía cortar nada.
  const abrirDetalle = useCallback((e: Event) => setDetalle(e), []);
  const borrarEvento = useCallback((eventId: string) => { deleteEvent.mutate(eventId); }, [deleteEvent.mutate]);

  /**
   * `renderItem` estable y SIN `entering` por celda: la FlatList recicla las
   * celdas al scrollear, así que la animación de entrada se volvía a disparar
   * sobre vistas ya vistas y se acumulaban decenas de animaciones.
   */
  const renderFila = useCallback(({ item }: { item: FeedItem }) => {
    if (item.kind === 'dia') {
      return <Text style={s.diaHeader}>{item.label}</Text>;
    }
    const e = item.event;
    return (
      <FilaEvento
        e={e}
        foto={e.horse?.image_url ?? (e.horse ? fotosPorCaballo[e.horse.id] : null)}
        tipoLabel={typeLabels[e.type]?.label ?? e.type}
        canDelete={canDelete}
        onPress={abrirDetalle}
        onDelete={borrarEvento}
        c={c}
        s={s}
      />
    );
  }, [s, c, typeLabels, canDelete, abrirDetalle, borrarEvento, fotosPorCaballo]);

  if (isError && events.length === 0) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (isLoading) {
    return (
      <View style={s.esqueleto}>
        <Skeleton width={40} height={14} style={{ marginLeft: space[4] + 2 }} />
        {[1, 2, 3, 4].map((i) => <FilaEventoSkeleton key={i} s={s} />)}
      </View>
    );
  }

  if (!events.length) {
    return (
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
      >
        <EmptyState
          icon="document-text-outline"
          title={horseId ? 'Sin eventos de este caballo' : 'Sin eventos registrados'}
          message="Los eventos de salud, entrenamiento y gastos aparecerán acá."
          actionLabel={canCreate ? 'Cargar el primero' : undefined}
          onAction={irANuevo}
        />
      </ScrollView>
    );
  }

  return (
    <>
      {/* Entra el feed entero, una vez. */}
      <Animated.View entering={entradaLista()} style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          data={feed}
          keyExtractor={(item) => item.key}
          contentContainerStyle={s.lista}
          renderItem={renderFila}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={s.cargando}>
                <ActivityIndicator size="small" color={c.brand} />
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
          // Filas chicas con foto: conviene soltar las de fuera de pantalla
          // (cada una instala un gesto nativo de swipe y decodifica una imagen).
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={9}
        />
      </Animated.View>

      {/* Detalle del evento: hoja nativa con lo que la fila no muestra */}
      <BottomSheet
        visible={!!detalle}
        onClose={() => setDetalle(null)}
        title={detalle ? (typeLabels[detalle.type]?.label ?? 'Evento') : undefined}
      >
        {detalle && (
          <View style={s.detalle}>
            <Text style={s.detalleDesc}>{detalle.description}</Text>
            <View>
              {detalle.horse?.name ? (
                <View style={s.detalleFila}>
                  <Text style={s.detalleLabel}>Caballo</Text>
                  <Text style={s.detalleValor}>{detalle.horse.name}</Text>
                </View>
              ) : null}
              <View style={s.detalleFila}>
                <Text style={s.detalleLabel}>Fecha</Text>
                <Text style={s.detalleValor}>{fechaHumana(detalle.date)}</Text>
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
    </>
  );
}

export default function EventosScreen() {
  const router = useRouter();
  const { can } = useAuth();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { data: horses } = useHorses();
  const [horseId, setHorseId] = useState('');
  const canCreate = can('events', 'create');

  // Con un solo caballo los chips no filtran nada: son ruido en pantalla.
  const hayFiltros = (horses ?? []).length > 1;

  const irANuevo = () => { haptic.medium(); router.push(Routes.eventoNuevo as never); };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.titulo}>Eventos</Text>
        {canCreate ? (
          <PressableScale
            style={s.btnMas}
            onPress={irANuevo}
            accessibilityRole="button"
            accessibilityLabel="Cargar evento"
          >
            <Plus size={24} color={c.bg} strokeWidth={2.2} />
          </PressableScale>
        ) : null}
      </View>

      {hayFiltros ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          style={s.chipsScroll}
        >
          <PressableScale
            style={[s.chip, s.chipTodos, !horseId && s.chipActivo]}
            onPress={() => { haptic.selection(); setHorseId(''); }}
            accessibilityRole="button"
            accessibilityState={{ selected: !horseId }}
            accessibilityLabel="Todos los caballos"
          >
            <Text style={[s.chipTexto, !horseId && s.chipTextoActivo]}>Todos</Text>
          </PressableScale>

          {(horses ?? []).map((h) => {
            const activo = horseId === h.id;
            return (
              <PressableScale
                key={h.id}
                style={[s.chip, activo && s.chipActivo]}
                onPress={() => { haptic.selection(); setHorseId(activo ? '' : h.id); }}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                accessibilityLabel={`Ver solo ${h.name}`}
              >
                {h.image_url ? (
                  <AppImage source={{ uri: h.image_url }} style={s.chipFoto} />
                ) : (
                  <View style={[s.chipFoto, s.chipFotoVacia]}>
                    <HorseshoeH size={14} color={c.textFaint} />
                  </View>
                )}
                <Text style={[s.chipTexto, activo && s.chipTextoActivo]} numberOfLines={1}>{h.name}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : null}

      {/* El `key` remonta el feed al cambiar de caballo: ver FeedEventos. */}
      <FeedEventos key={horseId || 'todos'} horseId={horseId} c={c} s={s} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  lista: { paddingTop: space[2], paddingBottom: 140 },
  esqueleto: { paddingTop: space[4] },

  /* ─── Encabezado ───────────────────────────────────────────────────────── */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space[4] + 2, paddingTop: space[3], paddingBottom: space[2],
  },
  titulo: { fontSize: text['2xl'], fontWeight: weight.bold, color: c.text, letterSpacing: -1.1 },
  btnMas: {
    width: 46, height: 46, borderRadius: radius.thumb,
    backgroundColor: c.text, alignItems: 'center', justifyContent: 'center',
  },

  /* ─── Chips de caballo ─────────────────────────────────────────────────── */
  chipsScroll: { maxHeight: 52, marginTop: space[1] },
  chips: { gap: space[2], paddingHorizontal: space[4] + 2, paddingVertical: space[1] },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    height: 36, paddingLeft: space[1] + 2, paddingRight: space[3] + 2,
    borderRadius: radius.full, backgroundColor: c.surface,
    ...(c.isDark ? {} : shadow.sm),
  },
  chipTodos: { paddingLeft: space[4], paddingRight: space[4] },
  // Selección invertida neutra, igual que en la lista de caballos.
  chipActivo: { backgroundColor: c.text },
  chipFoto: { width: 26, height: 26, borderRadius: radius.full },
  chipFotoVacia: { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  chipTexto: { fontSize: text.sm, fontWeight: weight.medium, color: c.textMuted },
  chipTextoActivo: { color: c.bg, fontWeight: weight.semibold },

  /* ─── Feed ─────────────────────────────────────────────────────────────── */
  diaHeader: {
    fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint,
    paddingHorizontal: space[4] + 2, paddingTop: space[5], paddingBottom: space[1],
  },
  fila: {
    flexDirection: 'row', gap: space[3] + 1,
    paddingHorizontal: space[4] + 2, paddingVertical: space[3],
  },
  filaFoto: { width: 44, height: 44, borderRadius: radius.md + 3, flexShrink: 0 },
  filaFotoVacia: { backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  filaMain: { flex: 1, minWidth: 0 },
  filaHead: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] + 3 },
  filaNombre: { fontSize: text.base, fontWeight: weight.semibold, color: c.text, flexShrink: 1 },
  filaTipo: { fontSize: text.xs + 1, color: c.textFaint, textTransform: 'lowercase' },
  filaDesc: { fontSize: text.base - 1, color: c.textMuted, lineHeight: 21, marginTop: 3 },
  // El monto es el dato hero de un gasto: por eso es lo único en negrita.
  filaMonto: { fontSize: text.md, fontWeight: weight.bold, color: c.text, marginTop: 5, fontVariant: ['tabular-nums'] },
  cargando: { padding: space[5], alignItems: 'center' },

  /* ─── Detalle ──────────────────────────────────────────────────────────── */
  detalle: { gap: space[4], paddingBottom: space[2] },
  detalleDesc: { fontSize: text.md, color: c.text, lineHeight: 23 },
  detalleFila: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  detalleLabel: { fontSize: text.sm, color: c.textFaint },
  detalleValor: { fontSize: text.sm, fontWeight: weight.medium, color: c.text },
  detalleFoto: { width: 96, height: 96, borderRadius: radius.md },
});

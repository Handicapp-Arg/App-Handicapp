import { useState, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MessageCircle, ArrowUp, X, Plus, HeartPulse, Activity, ClipboardCheck, Receipt, StickyNote,
  type LucideIcon,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useHorse } from '../../../../hooks/use-horses';
import { useEventsByHorse } from '../../../../hooks/use-events';
import { useEventComments, useAddEventComment, useDeleteEventComment } from '../../../../hooks/use-event-comments';
import { TrainingMetricsPanel } from '../../../../components/TrainingMetricsPanel';
import { Avatar } from '../../../../components/Avatar';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { formatCurrency } from '../../../../lib/currency';
import { colors, makeEventTypeColors } from '../../../../lib/colors';
import { fechaHumana, hora } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight, touch, radius, brandShadow } from '../../../../styles/tokens';
import { entradaLista } from '../../../../styles/motion';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { PressableScale } from '../../../../components/PressableScale';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { Skeleton } from '../../../../components/Skeleton';
import { Routes, nav } from '../../../../lib/routes';
import type { Event } from '../../../../../packages/shared/src';

/** Ícono por tipo de evento. El color sale de `makeEventTypeColors` (theme). */
const ICONO_TIPO: Record<string, LucideIcon> = {
  salud: HeartPulse,
  entrenamiento: Activity,
  tarea: ClipboardCheck,
  gasto: Receipt,
  nota: StickyNote,
};

/**
 * Filtros del historial. Agrupan tipos del backend, no inventan categorías:
 * "Trabajo" junta entrenamiento y tarea porque para el usuario son lo mismo.
 */
const FILTROS: { key: string; label: string; tipos: string[] | null }[] = [
  { key: 'todo',    label: 'Todo',    tipos: null },
  { key: 'salud',   label: 'Salud',   tipos: ['salud'] },
  { key: 'trabajo', label: 'Trabajo', tipos: ['entrenamiento', 'tarea'] },
  { key: 'gastos',  label: 'Gastos',  tipos: ['gasto'] },
  { key: 'notas',   label: 'Notas',   tipos: ['nota'] },
];

/** Fila de la lista: o un encabezado de día, o un evento. */
type Fila =
  | { kind: 'dia'; key: string; label: string }
  | { kind: 'evento'; key: string; event: Event; ultimoDelDia: boolean };

/* ─── EventCommentThread ─── */
const EventCommentThread = memo(function EventCommentThread({ eventId, currentUserId, c, s }: { eventId: string; currentUserId?: string; c: ThemeColors; s: Styles }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const { data: comments } = useEventComments(eventId, open);
  const add = useAddEventComment(eventId);
  const del = useDeleteEventComment(eventId);
  const toast = useToast();

  const sendComment = async () => {
    const trimmed = texto.trim();
    if (!trimmed) return;
    haptic.light();
    try {
      await add.mutateAsync(trimmed);
      setTexto('');
    } catch {
      haptic.error();
      toast.error('No se pudo enviar el comentario. Probá de nuevo.');
    }
  };

  return (
    <View style={s.commentRoot}>
      <PressableScale
        scaleTo={0.97}
        style={s.commentToggle}
        onPress={() => { haptic.selection(); setOpen((p) => !p); }}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Ocultar comentarios' : 'Ver comentarios'}
      >
        <MessageCircle size={13} color={c.textFaint} strokeWidth={2} />
        <Text style={s.commentToggleText}>
          {open ? 'Ocultar' : 'Comentarios'}{comments && comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
      </PressableScale>
      {open && (
        <View style={s.commentBody}>
          {comments?.map((cm) => (
            <View key={cm.id} style={s.commentRow}>
              <Avatar name={cm.user?.name} size={24} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.commentAuthor}>{cm.user?.name}</Text>
                  <Text style={s.commentDate}>{fechaHumana(cm.created_at)}</Text>
                </View>
                <Text style={s.commentText}>{cm.text}</Text>
              </View>
              {cm.user_id === currentUserId && (
                <PressableScale
                  onPress={() => { haptic.light(); del.mutate(cm.id); }}
                  style={{ paddingLeft: 6 }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar comentario"
                >
                  <X size={14} color={c.textFaint} strokeWidth={2} />
                </PressableScale>
              )}
            </View>
          ))}
          <View style={s.commentInputRow}>
            <TextInput
              style={s.commentInput}
              value={texto}
              onChangeText={setTexto}
              placeholder="Escribí un comentario…"
              placeholderTextColor={c.textFaint}
              multiline
              returnKeyType="send"
              onSubmitEditing={sendComment}
            />
            <PressableScale
              style={[s.commentSend, (!texto.trim() || add.isPending) && { opacity: 0.4 }]}
              disabled={!texto.trim() || add.isPending}
              onPress={sendComment}
              accessibilityRole="button"
              accessibilityLabel="Enviar comentario"
            >
              <ArrowUp size={16} color={colors.white} strokeWidth={2.2} />
            </PressableScale>
          </View>
        </View>
      )}
    </View>
  );
});

/**
 * Fila del timeline, memoizada y a nivel de módulo: cada una monta un panel de
 * métricas y un hilo de comentarios, así que re-renderizarlas de más es caro.
 */
const FilaTimeline = memo(function FilaTimeline({
  ev, ultimoDelDia, meta, canEdit, currentUserId, c, s,
}: {
  ev: Event;
  ultimoDelDia: boolean;
  meta: { bg: string; text: string; label: string };
  canEdit: boolean;
  currentUserId?: string;
  c: ThemeColors;
  s: Styles;
}) {
  const Icono = ICONO_TIPO[ev.type] ?? StickyNote;
  const horaEv = hora(ev.created_at);
  // Firma del registro: "Joaquín Pérez · 10:20". Los eventos viejos se
  // guardaron sin autor, así que la línea se arma con lo que haya.
  const firma = [ev.author?.name, horaEv].filter(Boolean).join(' · ');

  // Sin `entering` por fila: la FlatList recicla celdas al scrollear.
  return (
    <View style={s.timelineRow}>
      {/* Riel: la cajita del ícono y la línea que baja hasta el próximo item. */}
      <View style={s.riel}>
        <View style={[s.rielIcono, { backgroundColor: meta.bg }]}>
          <Icono size={19} color={meta.text} strokeWidth={1.9} />
        </View>
        {!ultimoDelDia && <View style={s.rielLinea} />}
      </View>

      <View style={s.timelineBody}>
        <View style={s.timelineTitulo}>
          <Text style={s.eventoTipo}>{meta.label}</Text>
          {ev.amount != null && (
            <Text style={s.eventoMonto}>{formatCurrency(ev.amount, ev.currency ?? 'ARS')}</Text>
          )}
        </View>
        {!!ev.description && <Text style={s.eventoDesc}>{ev.description}</Text>}
        {!!firma && <Text style={s.eventoMeta}>{firma}</Text>}

        {ev.type === 'entrenamiento' && (
          <TrainingMetricsPanel eventId={ev.id} canEdit={canEdit} />
        )}
        <EventCommentThread eventId={ev.id} currentUserId={currentUserId} c={c} s={s} />
      </View>
    </View>
  );
});

export default function HistorialScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const tipoColors = useMemo(() => makeEventTypeColors(c), [c]);
  const [filtro, setFiltro] = useState('todo');

  const { data: horse, isLoading, isError, refetch } = useHorse(id);
  const { data: events } = useEventsByHorse(id);

  /**
   * El historial se aplana en una sola lista de filas (encabezado de día +
   * eventos) para que la FlatList virtualice todo junto: con SectionList o con
   * un map anidado el scroll de un caballo con cientos de eventos se traba.
   */
  const filas = useMemo<Fila[]>(() => {
    const tipos = FILTROS.find((f) => f.key === filtro)?.tipos ?? null;
    const ordenados = [...(events ?? [])]
      .filter((e) => !tipos || tipos.includes(e.type))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const out: Fila[] = [];
    let diaActual = '';
    ordenados.forEach((ev, i) => {
      const label = fechaHumana(ev.date) || 'Sin fecha';
      if (label !== diaActual) {
        diaActual = label;
        out.push({ kind: 'dia', key: `dia-${label}-${i}`, label });
      }
      const siguiente = ordenados[i + 1];
      const ultimoDelDia = !siguiente || (fechaHumana(siguiente.date) || 'Sin fecha') !== label;
      out.push({ kind: 'evento', key: ev.id, event: ev, ultimoDelDia });
    });
    return out;
  }, [events, filtro]);

  const totalEventos = events?.length ?? 0;
  const puedeCrear = can('events', 'create');

  /** `renderItem` estable: cambiar de filtro no re-renderiza celda por celda. */
  const renderFila = useCallback(({ item }: { item: Fila }) => {
    if (item.kind === 'dia') {
      return <Text style={s.diaLabel}>{item.label}</Text>;
    }
    return (
      <FilaTimeline
        ev={item.event}
        ultimoDelDia={item.ultimoDelDia}
        meta={tipoColors[item.event.type] ?? tipoColors.nota}
        canEdit={puedeCrear}
        currentUserId={user?.id}
        c={c}
        s={s}
      />
    );
  }, [s, c, tipoColors, puedeCrear, user?.id]);

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Historial" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    // Silueta real: fila de chips y después items de timeline con su cajita.
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Historial" />
        <View style={s.chipsRow}>
          {[64, 76, 88, 80].map((w, i) => <Skeleton key={i} width={w} height={36} borderRadius={radius.full} />)}
        </View>
        <View style={{ paddingHorizontal: space[4], marginTop: space[6], gap: space[5] }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space[3] + 2 }}>
              <Skeleton width={40} height={40} borderRadius={radius.thumb - 2} />
              <View style={{ flex: 1, gap: space[2] }}>
                <Skeleton width="55%" height={17} />
                <Skeleton height={14} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        scrollable
        showBack
        title="Historial"
        subtitle={`${horse.name}${totalEventos > 0 ? ` · ${totalEventos} registro${totalEventos === 1 ? '' : 's'}` : ''}`}
      />

      {/* ─── Filtros ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {FILTROS.map((f) => {
          const activo = f.key === filtro;
          return (
            <PressableScale
              key={f.key}
              style={[s.chip, activo ? s.chipActivo : s.chipInactivo]}
              onPress={() => { haptic.selection(); setFiltro(f.key); }}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`Filtrar por ${f.label}`}
            >
              <Text style={[s.chipText, activo ? s.chipTextActivo : s.chipTextInactivo]}>{f.label}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      {/* Entra el timeline completo, una vez, no fila por fila. */}
      <Animated.View entering={entradaLista()} style={{ flex: 1 }}>
      <FlatList
        data={filas}
        keyExtractor={(f) => f.key}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[20], paddingTop: space[5] }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ paddingHorizontal: space[4] }}>
            <EmptyState
              icon="newspaper-outline"
              title={filtro === 'todo' ? 'Sin eventos registrados' : 'Nada en este filtro'}
              message={filtro === 'todo'
                ? 'Registrá notas, entrenamientos, salud y gastos para armar el historial.'
                : 'Probá con otro filtro o agregá el primero.'}
            />
          </View>
        }
        renderItem={renderFila}
        // Filas altas (panel de métricas + hilo de comentarios): conviene
        // montar pocas y soltar las que salen de pantalla.
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
      />
      </Animated.View>

      {/* ─── CTA fijo ─── */}
      {can('events', 'create') && (
        <>
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', c.bg]}
            style={[s.velo, { height: insets.bottom + space[20] }]}
          />
          <View style={[s.ctaWrap, { paddingBottom: insets.bottom + space[4] }]}>
            <PressableScale
              style={s.cta}
              // El formulario de nuevo evento es una pantalla empujada
              // (./evento-nuevo.tsx); el caballo va implícito en la ruta.
              onPress={() => { haptic.light(); nav.push(router, Routes.caballoEventoNuevo(id)); }}
              accessibilityRole="button"
              accessibilityLabel="Agregar un evento al historial"
            >
              <Plus size={19} color={colors.white} strokeWidth={2.4} />
              <Text style={s.ctaText}>Agregar al historial</Text>
            </PressableScale>
          </View>
        </>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  /* Chips de filtro */
  chipsRow: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[1] },
  chip: { height: 36, paddingHorizontal: space[4] - 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  chipActivo: { backgroundColor: c.text },
  chipInactivo: { backgroundColor: c.surfaceAlt },
  chipText: { fontSize: text.sm },
  chipTextActivo: { color: c.bg, fontWeight: weight.semibold },
  chipTextInactivo: { color: c.textMuted, fontWeight: weight.medium },

  /* Timeline */
  diaLabel: {
    fontSize: text.sm, fontWeight: weight.semibold, color: c.textFaint,
    paddingHorizontal: space[4], marginTop: space[3], marginBottom: space[3],
  },
  timelineRow: { flexDirection: 'row', gap: space[3] + 2, paddingHorizontal: space[4] },
  riel: { width: 40, alignItems: 'center' },
  rielIcono: { width: 40, height: 40, borderRadius: radius.thumb - 2, alignItems: 'center', justifyContent: 'center' },
  // La línea crece hasta el alto del item: es lo que encadena el día completo.
  rielLinea: { width: 2, flex: 1, backgroundColor: c.border, marginTop: space[2] - 2 },
  timelineBody: { flex: 1, paddingBottom: space[5] },
  timelineTitulo: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  eventoTipo: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  eventoMonto: { fontSize: text.base, fontWeight: weight.bold, color: c.text, fontVariant: ['tabular-nums'] },
  eventoDesc: { fontSize: text.base - 1, color: c.textMuted, lineHeight: 21, marginTop: 3 },
  eventoMeta: { fontSize: text.sm - 1, color: c.textFaint, marginTop: 6 },

  /* Comentarios */
  commentRoot: { marginTop: space[2] },
  commentToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: space[1] },
  commentToggleText: { fontSize: text.sm, color: c.textFaint, fontWeight: weight.semibold },
  commentBody: { marginTop: space[2], gap: space[2] },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  commentAuthor: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  commentDate: { fontSize: text.xs, color: c.textFaint },
  commentText: { fontSize: text.base - 1, color: c.text, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: space[2] - 2, alignItems: 'flex-end', marginTop: space[1] },
  commentInput: {
    flex: 1, borderRadius: radius.field, paddingHorizontal: space[3], paddingVertical: space[2],
    fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt, minHeight: touch.min, maxHeight: 96,
  },
  commentSend: { width: touch.min, height: touch.min, borderRadius: radius.field, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center' },

  /* CTA */
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  ctaWrap: { position: 'absolute', left: space[4], right: space[4], bottom: 0 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] + 1,
    height: touch.button, borderRadius: radius.button, backgroundColor: c.brand,
    ...(c.isDark ? {} : brandShadow(c.brand)),
  },
  ctaText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});

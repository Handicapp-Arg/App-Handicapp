import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, ArrowUp, X } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useHorse } from '../../../../hooks/use-horses';
import { useEventsByHorse } from '../../../../hooks/use-events';
import { useEventComments, useAddEventComment, useDeleteEventComment } from '../../../../hooks/use-event-comments';
import { TrainingMetricsPanel } from '../../../../components/TrainingMetricsPanel';
import { EventTypeBadge } from '../../../../components/EventTypeBadge';
import { Avatar } from '../../../../components/Avatar';
import { useAuth } from '../../../../lib/auth';
import { haptic } from '../../../../lib/haptics';
import { useToast } from '../../../../components/Toast';
import { formatCurrency } from '../../../../lib/currency';
import { colors } from '../../../../lib/colors';
import { fechaHumana } from '../../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../../lib/theme';
import { space, text, weight, touch, radius } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { EmptyState } from '../../../../components/EmptyState';
import { ErrorState } from '../../../../components/ErrorState';
import { EventRowSkeleton } from '../../../../components/Skeleton';
import { Routes, nav } from '../../../../lib/routes';
import type { Event } from '../../../../../packages/shared/src';

/* ─── EventCommentThread ─── */
function EventCommentThread({ eventId, currentUserId, c, s }: { eventId: string; currentUserId?: string; c: ThemeColors; s: Styles }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { data: comments } = useEventComments(eventId, open);
  const add = useAddEventComment(eventId);
  const del = useDeleteEventComment(eventId);
  const toast = useToast();

  const sendComment = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    haptic.light();
    try {
      await add.mutateAsync(trimmed);
      setText('');
    } catch {
      haptic.error();
      toast.error('No se pudo enviar el comentario. Probá de nuevo.');
    }
  };

  return (
    <View style={s.commentRoot}>
      <TouchableOpacity style={s.commentToggle} onPress={() => { haptic.selection(); setOpen((p) => !p); }} activeOpacity={0.7}>
        <MessageCircle size={12} color={c.textFaint} strokeWidth={2} />
        <Text style={s.commentToggleText}>
          {open ? 'Ocultar' : 'Comentarios'}{comments && comments.length > 0 ? ` (${comments.length})` : ''}
        </Text>
      </TouchableOpacity>
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
                <TouchableOpacity
                  onPress={() => { haptic.light(); del.mutate(cm.id); }}
                  style={{ paddingLeft: 6 }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar comentario"
                >
                  <X size={14} color={colors.gray300} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <View style={s.commentInputRow}>
            <TextInput style={s.commentInput} value={text} onChangeText={setText} placeholder="Escribí un comentario..." placeholderTextColor={c.textFaint} multiline returnKeyType="send" onSubmitEditing={sendComment} />
            <TouchableOpacity
              style={[s.commentSend, (!text.trim() || add.isPending) && { opacity: 0.4 }]}
              disabled={!text.trim() || add.isPending}
              onPress={sendComment}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Enviar comentario"
            >
              <ArrowUp size={16} color={colors.white} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

/* ─── EventCard ─── */
function EventCard({ event, currentUserId, canEdit, isLast, c, s }: { event: Event; currentUserId?: string; canEdit?: boolean; isLast?: boolean; c: ThemeColors; s: Styles }) {
  const date = fechaHumana(event.date);
  return (
    <View style={[s.eventRow, isLast && s.eventRowLast]}>
      <View style={s.eventHeader}>
        <EventTypeBadge type={event.type} />
        <Text style={s.eventDate}>{date}</Text>
      </View>
      <Text style={s.eventDesc}>{event.description}</Text>
      {event.amount != null && (
        <Text style={s.eventAmount}>{formatCurrency(event.amount, event.currency ?? 'ARS')}</Text>
      )}
      {event.type === 'entrenamiento' && (
        <TrainingMetricsPanel eventId={event.id} canEdit={canEdit ?? false} />
      )}
      <EventCommentThread eventId={event.id} currentUserId={currentUserId} c={c} s={s} />
    </View>
  );
}

export default function HistorialScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading, isError, refetch } = useHorse(id);
  const { data: events } = useEventsByHorse(id);

  if (isError && !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Historial" />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !horse) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <ScreenHeader scrollable showBack title="Historial" />
        <View style={{ paddingVertical: space[2] }}>
          {[1, 2, 3, 4, 5].map((i) => <EventRowSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  const sortedEvents = [...(events ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Historial" subtitle={horse.name} />
      {/* FlatList y no ScrollView+map: el historial de un caballo crece sin techo. */}
      <FlatList
        data={sortedEvents}
        keyExtractor={(ev) => ev.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={[s.section, s.sectionHeader, { justifyContent: 'space-between' }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Historial de eventos</Text>
              {sortedEvents.length > 0 && (
                <View style={s.countBadge}><Text style={s.countText}>{sortedEvents.length}</Text></View>
              )}
            </View>
            {can('events', 'create') && (
              // El formulario de nuevo evento ahora es una pantalla empujada:
              // ./evento-nuevo.tsx (el caballo va implícito en la ruta).
              <TouchableOpacity onPress={() => { haptic.light(); nav.push(router, Routes.caballoEventoNuevo(id)); }} style={s.smallBtn} activeOpacity={0.75}>
                <Text style={s.smallBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={s.section}>
            <EmptyState
              icon="newspaper-outline"
              title="Sin eventos registrados"
              message="Registrá notas, entrenamientos, salud y carreras para armar el historial."
            />
          </View>
        }
        renderItem={({ item: ev, index }) => (
          <View style={[s.section, s.eventsList]}>
            <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 45)}>
              <EventCard event={ev} currentUserId={user?.id} canEdit={can('events', 'create')} isLast={index === sortedEvents.length - 1} c={c} s={s} />
            </Animated.View>
          </View>
        )}
      />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { marginHorizontal: space[4], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: weight.bold, color: c.text, letterSpacing: -0.3 },
  countBadge: { backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: space[2], paddingVertical: 2 },
  countText: { fontSize: text.xs, fontWeight: weight.bold, color: c.textMuted },

  /* Eventos */
  eventsList: { gap: 0 },
  eventRow: { paddingVertical: space[4], gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  eventRowLast: { borderBottomWidth: 0 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventDate: { fontSize: text.xs, color: c.textFaint },
  eventDesc: { fontSize: text.base, color: c.text, lineHeight: 22 },
  eventAmount: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },

  /* Comentarios */
  commentRoot: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: 8 },
  commentToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentToggleText: { fontSize: text.sm, color: c.textFaint, fontWeight: weight.semibold },
  commentBody: { marginTop: 8, gap: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAuthor: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  commentDate: { fontSize: text.xs, color: c.textFaint },
  commentText: { fontSize: text.base, color: c.text, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', marginTop: 4 },
  commentInput: { flex: 1, borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[2], fontSize: text.base, color: c.text, backgroundColor: c.surfaceAlt, minHeight: touch.min, maxHeight: 96 },
  commentSend: { width: touch.min, height: touch.min, borderRadius: radius.md, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center' },

  smallBtn: { minHeight: touch.min, justifyContent: 'center', borderRadius: radius.full, paddingHorizontal: space[3], backgroundColor: c.surfaceAlt },
  smallBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
});

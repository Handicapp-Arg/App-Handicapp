import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle, ArrowUp, X, FileText, Dumbbell, Syringe, Flag } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useHorse } from '../../../../hooks/use-horses';
import { useEventsByHorse, useCreateEvent } from '../../../../hooks/use-events';
import { useEventComments, useAddEventComment, useDeleteEventComment } from '../../../../hooks/use-event-comments';
import { todayISO } from '../../../../hooks/use-routines';
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
import { space, text, weight } from '../../../../styles/tokens';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { FormSheet } from '../../../../components/FormSheet';
import { DatePicker } from '../../../../components/DatePicker';
import { Spinner } from '../../../../components/Spinner';
import type { Event } from '../../../../../packages/shared/src';

/* ─── EventCommentThread ─── */
function EventCommentThread({ eventId, currentUserId, c, s }: { eventId: string; currentUserId?: string; c: ThemeColors; s: Styles }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { data: comments } = useEventComments(eventId, open);
  const add = useAddEventComment(eventId);
  const del = useDeleteEventComment(eventId);

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
            <TextInput style={s.commentInput} value={text} onChangeText={setText} placeholder="Escribí un comentario..." placeholderTextColor={c.textFaint} multiline />
            <TouchableOpacity
              style={[s.commentSend, (!text.trim() || add.isPending) && { opacity: 0.4 }]}
              disabled={!text.trim() || add.isPending}
              onPress={async () => { haptic.light(); await add.mutateAsync(text.trim()); setText(''); }}
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
  const insets = useSafeAreaInsets();
  const { can, user } = useAuth();
  const { c } = useTheme();
  const toast = useToast();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: horse, isLoading } = useHorse(id);
  const { data: events } = useEventsByHorse(id);
  const createEvent = useCreateEvent();
  const today = todayISO();

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventType, setNewEventType] = useState<'salud' | 'entrenamiento' | 'carrera' | 'nota'>('nota');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState(today);
  const [newEventError, setNewEventError] = useState('');

  useEffect(() => {
    if (!showAddEvent) return;
    setNewEventType('nota');
    setNewEventDesc('');
    setNewEventDate(today);
    setNewEventError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddEvent]);

  const handleAddEvent = async () => {
    if (!newEventDesc.trim()) { setNewEventError('La descripción es obligatoria'); haptic.error(); return; }
    setNewEventError('');
    try {
      await createEvent.mutateAsync({
        type: newEventType,
        description: newEventDesc.trim(),
        date: newEventDate,
        horse_id: id,
      });
      haptic.success();
      toast.success('Evento agregado');
      setShowAddEvent(false);
    } catch {
      haptic.error();
      setNewEventError('No se pudo guardar el evento.');
    }
  };

  if (isLoading || !horse) return <Spinner />;

  const sortedEvents = [...(events ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader scrollable showBack title="Historial" subtitle={horse.name} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + space[10] }} showsVerticalScrollIndicator={false}>
        <View style={s.section}>
          <View style={[s.sectionHeader, { justifyContent: 'space-between' }]}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Historial de eventos</Text>
              {sortedEvents.length > 0 && (
                <View style={s.countBadge}><Text style={s.countText}>{sortedEvents.length}</Text></View>
              )}
            </View>
            {can('events', 'create') && (
              <TouchableOpacity onPress={() => { haptic.light(); setShowAddEvent(true); }} style={s.smallBtn}>
                <Text style={s.smallBtnText}>+ Agregar</Text>
              </TouchableOpacity>
            )}
          </View>
          {sortedEvents.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>Sin eventos registrados</Text></View>
          ) : (
            <View style={s.eventsList}>
              {sortedEvents.map((ev, index) => (
                <Animated.View key={ev.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 45)}>
                  <EventCard event={ev} currentUserId={user?.id} canEdit={can('events', 'create')} isLast={index === sortedEvents.length - 1} c={c} s={s} />
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Hoja agregar evento ─── */}
      <FormSheet
        visible={showAddEvent}
        onClose={() => setShowAddEvent(false)}
        title="Registrar evento"
        footer={
          <>
            <TouchableOpacity style={[s.btn, s.btnSecondary, { flex: 1 }]} onPress={() => setShowAddEvent(false)} accessibilityRole="button" accessibilityLabel="Cancelar registro de evento">
              <Text style={s.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.btnPrimary, { flex: 1 }, createEvent.isPending && { opacity: 0.6 }]}
              onPress={handleAddEvent}
              disabled={createEvent.isPending}
              accessibilityRole="button"
              accessibilityLabel="Guardar evento"
            >
              {createEvent.isPending
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={s.btnPrimaryText}>Guardar</Text>
              }
            </TouchableOpacity>
          </>
        }
      >
        <Text style={s.fieldLabel}>Tipo de evento</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([
            { key: 'nota', label: 'Nota', color: '#374151', Icon: FileText },
            { key: 'entrenamiento', label: 'Entrenamiento', color: '#a16207', Icon: Dumbbell },
            { key: 'salud', label: 'Salud', color: '#b91c1c', Icon: Syringe },
            { key: 'carrera', label: 'Carrera', color: '#92400e', Icon: Flag },
          ] as const).map((t) => {
            const active = newEventType === t.key;
            const iconColor = active ? t.color : c.textMuted;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  s.typeChip,
                  { flexDirection: 'row', alignItems: 'center', gap: 6 },
                  active && { backgroundColor: c.isDark ? t.color + '26' : t.color + '18' },
                ]}
                onPress={() => { haptic.selection(); setNewEventType(t.key); }}
                activeOpacity={0.7}
              >
                <t.Icon size={14} color={iconColor} strokeWidth={2} />
                <Text style={[s.typeChipText, active && { color: t.color }]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <DatePicker label="Fecha" value={newEventDate} onChange={setNewEventDate} maxDate={new Date()} />

        <TextInput
          style={[s.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
          value={newEventDesc}
          onChangeText={setNewEventDesc}
          placeholder={
            newEventType === 'nota' ? 'Ej: El caballo come bien, buen estado general' :
            newEventType === 'entrenamiento' ? 'Ej: Galope 1200m, tiempo 1:14, buena respuesta' :
            newEventType === 'salud' ? 'Ej: Vacunación influenza equina Dr. García' :
            'Ej: Gran Premio Palermo 1200m - 3° puesto'
          }
          placeholderTextColor={c.textFaint}
          multiline
          autoCapitalize="sentences"
          returnKeyType="done"
        />
        {newEventError ? <Text style={s.fieldError}>{newEventError}</Text> : null}
      </FormSheet>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  section: { marginHorizontal: space[4], gap: space[2] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: text.md, fontWeight: '700', color: c.text, letterSpacing: -0.3 },
  countBadge: { backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { fontSize: 11, fontWeight: '700', color: c.textMuted },
  emptyText: { fontSize: 13, color: c.textFaint },
  empty: { alignItems: 'center', paddingVertical: 24 },

  /* Eventos */
  eventsList: { gap: 0 },
  eventRow: { paddingVertical: space[4], gap: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  eventRowLast: { borderBottomWidth: 0 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventDate: { fontSize: 11, color: c.textFaint },
  eventDesc: { fontSize: text.base, color: c.text, lineHeight: 22 },
  eventAmount: { fontSize: 14, fontWeight: '700', color: c.text },

  /* Comentarios */
  commentRoot: { marginTop: 8, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  commentToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentToggleText: { fontSize: 11, color: c.textFaint, fontWeight: '600' },
  commentBody: { marginTop: 8, gap: 8 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  commentAuthor: { fontSize: 11, fontWeight: '700', color: c.text },
  commentDate: { fontSize: 10, color: c.textFaint },
  commentText: { fontSize: 12, color: c.text, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end', marginTop: 4 },
  commentInput: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: c.text, backgroundColor: c.surfaceAlt, minHeight: 36, maxHeight: 80 },
  commentSend: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.brand, justifyContent: 'center', alignItems: 'center' },

  smallBtn: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: c.surfaceAlt },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: c.text },
  typeChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: c.surfaceAlt },
  typeChipText: { fontSize: 13, fontWeight: '600', color: c.textMuted },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: c.text },
  fieldError: { fontSize: 13, color: colors.red500 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: c.text, backgroundColor: c.surfaceAlt },
  btn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: c.brand },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.white },
  btnSecondary: { backgroundColor: c.surfaceAlt },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
});

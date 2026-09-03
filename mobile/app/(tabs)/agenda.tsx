import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ScrollView, TextInput, Platform, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { Check, X, Clock, List, CalendarDays, MoreVertical, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgenda, useCreateAppointment, useCompleteAppointment, useDeleteAppointment, APPOINTMENT_TYPES } from '../../hooks/use-agenda';
import { useHorses } from '../../hooks/use-horses';
import { DatePicker } from '../../components/DatePicker';
import { MonthCalendar } from '../../components/MonthCalendar';
import { ScreenHeader, HeaderButton } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { EventRowSkeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, touch } from '../../styles/tokens';
import { useCommonStyles } from '../../styles/common';
import { useToast } from '../../components/Toast';
import { ActionSheet } from '../../components/ActionSheet';
import { FormSheet } from '../../components/FormSheet';
import { SwipeableRow } from '../../components/SwipeableRow';

const TYPE_OPTIONS = Object.entries(APPOINTMENT_TYPES);

function AppointmentRow({
  appt,
  onComplete,
  onDelete,
  isLast,
  c,
  s,
}: {
  appt: ReturnType<typeof useAgenda>['data'] extends (infer T)[] | undefined ? T : never;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isLast?: boolean;
  c: ThemeColors;
  s: Styles;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!appt) return null;
  const meta = APPOINTMENT_TYPES[appt.type] ?? APPOINTMENT_TYPES.otro;
  const date = new Date(appt.scheduled_at);
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <SwipeableRow
      acciones={[
        ...(appt.completed ? [] : [{
          label: 'Completar',
          Icon: Check,
          color: c.success,
          onPress: () => onComplete(appt.id),
          accessibilityLabel: 'Marcar turno como completado',
        }]),
        {
          label: 'Eliminar',
          Icon: Trash2,
          color: c.danger,
          onPress: () => onDelete(appt.id),
          accessibilityLabel: 'Eliminar turno',
        },
      ]}
    >
      <View style={[s.apptRow, !isLast && s.apptRowDivider, appt.completed && { opacity: 0.5 }]}>
        <Text style={s.apptTime}>{timeStr}</Text>
        <View style={[s.typeDot, { backgroundColor: meta.color }]} />
        <View style={s.apptBody}>
          <Text style={s.apptTitle} numberOfLines={1}>{appt.title}</Text>
          <Text style={s.apptMeta} numberOfLines={1}>
            {appt.horse ? `${appt.horse.name} · ` : ''}{meta.label}{appt.completed ? ' · Completado' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { haptic.selection(); setMenuOpen(true); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Más opciones del turno"
        >
          <MoreVertical size={18} color={c.textFaint} strokeWidth={2} />
        </TouchableOpacity>

        <ActionSheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          acciones={[
            ...(appt.completed ? [] : [{
              label: 'Marcar como completado',
              Icon: Check,
              onPress: () => onComplete(appt.id),
            }]),
            {
              label: 'Eliminar turno',
              Icon: Trash2,
              destructiva: true,
              onPress: () => onDelete(appt.id),
            },
          ]}
        />
      </View>
    </SwipeableRow>
  );
}

function CreateModal({ visible, onClose, c, s }: { visible: boolean; onClose: () => void; c: ThemeColors; s: Styles }) {
  const { typography, modal: modalStyle, button, input: inputStyle } = useCommonStyles();
  const { data: horses } = useHorses();
  const create = useCreateAppointment();
  const toast = useToast();
  const [horseId, setHorseId] = useState(horses?.[0]?.id ?? '');
  const [type, setType] = useState('veterinario');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [timeDate, setTimeDate] = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const timeStr = timeDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  // La hoja ya no se destruye al cerrarse, así que el formulario se limpia al abrir.
  useEffect(() => {
    if (!visible) return;
    setTitle(''); setDate(''); setNotes(''); setError('');
    setType('veterinario');
    setHorseId(horses?.[0]?.id ?? '');
    const d = new Date(); d.setHours(9, 0, 0, 0); setTimeDate(d);
  }, [visible]);


  const handleSubmit = async () => {
    if (!horseId || !title.trim() || !date) { setError('Completá todos los campos obligatorios'); haptic.error(); return; }
    setError('');
    const dt = new Date(date + 'T12:00:00');
    dt.setHours(timeDate.getHours(), timeDate.getMinutes());
    try {
      await create.mutateAsync({ horse_id: horseId, type, title, scheduled_at: dt.toISOString(), notes: notes || undefined });
      haptic.success();
      toast.success('Turno agendado');
      onClose();
    } catch {
      haptic.error();
      setError('No se pudo agendar el turno. Intentá de nuevo.');
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Nuevo turno"
      footer={
        <>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={() => { haptic.light(); onClose(); }}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[button.primary, { flex: 1 }, create.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={create.isPending}
          >
            {create.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={button.primaryText}>Crear turno</Text>}
          </TouchableOpacity>
        </>
      }
    >
      <>
          {/* Caballo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Caballo *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
              {horses?.map((h) => (
                <TouchableOpacity key={h.id}
                  style={[s.chip, horseId === h.id && s.chipActive]}
                  onPress={() => { haptic.selection(); setHorseId(h.id); }}
                >
                  <Text style={[s.chipText, horseId === h.id && s.chipTextActive]}>{h.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tipo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Tipo</Text>
            <View style={s.typeGrid}>
              {TYPE_OPTIONS.map(([v, m]) => (
                <TouchableOpacity key={v}
                  style={[s.typeBtn, type === v && { backgroundColor: c.isDark ? m.color + '26' : m.bg }]}
                  onPress={() => { haptic.selection(); setType(v); }}
                >
                  <Text style={[s.typeBtnText, type === v && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Título */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Título *</Text>
            <TextInput style={inputStyle.base} value={title} onChangeText={setTitle} placeholder="Ej: Control anual" placeholderTextColor={c.textFaint} />
          </View>

          {/* Fecha y hora */}
          <DatePicker label="Fecha *" value={date} onChange={setDate} />
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Hora</Text>
            <Pressable
              onPress={() => { haptic.selection(); setShowTimePicker(true); }}
              style={[inputStyle.base, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            >
              <Text style={{ fontSize: text.base, color: c.text }}>{timeStr}</Text>
              <Clock size={18} color={c.textFaint} strokeWidth={2} />
            </Pressable>
            {showTimePicker && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selected) setTimeDate(selected);
                }}
              />
            )}
          </View>

          {/* Notas */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Notas (opcional)</Text>
            <TextInput style={inputStyle.multiline} value={notes} onChangeText={setNotes} multiline placeholder="Observaciones..." placeholderTextColor={c.textFaint} />
          </View>

          {error ? <Text style={s.errorText}>{error}</Text> : null}
      </>
    </FormSheet>
  );
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { layout } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const [upcoming, setUpcoming] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const { data: appointments, isLoading, isError, refetch, isRefetching } = useAgenda(viewMode === 'list' ? upcoming : false);
  const complete = useCompleteAppointment();
  const deleteAppt = useDeleteAppointment();

  const grouped = (appointments ?? []).reduce<Record<string, typeof appointments>>((acc, a) => {
    if (!a) return acc;
    const day = new Date(a.scheduled_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return { ...acc, [day]: [...(acc[day] ?? []), a] };
  }, {});

  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const markedDays = useMemo(
    () => new Set((appointments ?? []).filter(Boolean).map((a) => ymd(new Date(a!.scheduled_at)))),
    [appointments],
  );
  const dayAppts = (appointments ?? []).filter((a): a is NonNullable<typeof a> => !!a && ymd(new Date(a.scheduled_at)) === selectedDay);

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar turno', '¿Querés eliminar este turno?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { haptic.medium(); deleteAppt.mutate(id); } },
    ]);
  };

  const Header = (
    <>
      <ScreenHeader
        scrollable
        title="Agenda"
        right={
          <HeaderButton
            label="+ Turno"
            onPress={() => { haptic.medium(); setShowCreate(true); }}
          />
        }
      />

      {/* Barra: Lista/Mes + (solo en lista) Próximos/Todos, en una línea */}
      <View style={s.toolbar}>
        <View style={s.viewToggle}>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'list' && s.viewBtnActive]}
            onPress={() => { haptic.selection(); setViewMode('list'); }}
            activeOpacity={0.85}
          >
            <List size={18} color={viewMode === 'list' ? c.text : c.textMuted} strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.viewBtn, viewMode === 'calendar' && s.viewBtnActive]}
            onPress={() => { haptic.selection(); setViewMode('calendar'); }}
            activeOpacity={0.85}
          >
            <CalendarDays size={18} color={viewMode === 'calendar' ? c.text : c.textMuted} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {viewMode === 'list' && (
          <View style={s.toggle}>
            {(['upcoming', 'all'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[s.toggleBtn, upcoming === (v === 'upcoming') && s.toggleBtnActive]}
                onPress={() => { haptic.selection(); setUpcoming(v === 'upcoming'); }}
                activeOpacity={0.8}
              >
                <Text style={[s.toggleText, upcoming === (v === 'upcoming') && s.toggleTextActive]}>
                  {v === 'upcoming' ? 'Próximos' : 'Todos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>
      {viewMode === 'calendar' && isError ? (
        <View style={{ flex: 1 }}>
          {Header}
          <ErrorState onRetry={() => refetch()} />
        </View>
      ) : viewMode === 'calendar' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          {Header}
          <MonthCalendar
            monthCursor={monthCursor}
            onMonthChange={setMonthCursor}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            markedDays={markedDays}
          />
          <View style={{ paddingHorizontal: space[4], marginTop: space[2] }}>
            {!selectedDay ? (
              <Text style={s.calHint}>Tocá un día para ver sus turnos</Text>
            ) : dayAppts.length === 0 ? (
              <Text style={s.calHint}>Sin turnos para este día</Text>
            ) : (
              dayAppts.map((appt, index) => (
                <Animated.View key={appt.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
                  <AppointmentRow
                    appt={appt}
                    onComplete={(id) => complete.mutate(id)}
                    onDelete={handleDelete}
                    isLast={index === dayAppts.length - 1}
                    c={c} s={s}
                  />
                </Animated.View>
              ))
            )}
          </View>
        </ScrollView>
      ) : isLoading ? (
        <View style={{ flex: 1 }}>
          {Header}
          <View style={{ padding: space[4], gap: space[2] }}>
            {[1, 2, 3, 4, 5].map((i) => <EventRowSkeleton key={i} />)}
          </View>
        </View>
      ) : isError ? (
        <View style={{ flex: 1 }}>
          {Header}
          <ErrorState onRetry={() => refetch()} />
        </View>
      ) : !Object.keys(grouped).length ? (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          {Header}
          <EmptyState
            icon="calendar-outline"
            title={upcoming ? 'No hay turnos próximos' : 'Sin turnos registrados'}
            message={upcoming ? 'No tenés turnos programados. Creá el primero.' : 'Los turnos veterinarios y de servicio aparecerán aquí.'}
            actionLabel="+ Crear turno"
            onAction={() => { haptic.medium(); setShowCreate(true); }}
          />
        </ScrollView>
      ) : (
        <FlatList
          ListHeaderComponent={Header}
          data={Object.entries(grouped)}
          keyExtractor={([day]) => day}
          contentContainerStyle={{ paddingBottom: 120, gap: space[5] }}
          renderItem={({ item: [day, items], index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ gap: space[1], paddingHorizontal: space[4] }}>
              <Text style={s.dayLabel}>{day}</Text>
              {(items ?? []).map((appt, i) => appt ? (
                <AppointmentRow key={appt.id} appt={appt}
                  onComplete={(id) => complete.mutate(id)}
                  onDelete={handleDelete}
                  isLast={i === (items?.length ?? 0) - 1}
                  c={c} s={s}
                />
              ) : null)}
            </Animated.View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} c={c} s={s} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingTop: space[1], paddingBottom: space[2], gap: space[2] },
  toggle: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.full, padding: 3 },
  toggleBtn: { paddingHorizontal: space[4], minHeight: touch.min, justifyContent: 'center', alignItems: 'center', borderRadius: radius.full },
  toggleBtnActive: { backgroundColor: c.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  toggleTextActive: { color: c.text },
  viewToggle: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.full, padding: 3 },
  viewBtn: { alignItems: 'center', justifyContent: 'center', minHeight: touch.min, paddingHorizontal: space[4], borderRadius: radius.full },
  viewBtnActive: { backgroundColor: c.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  viewText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  viewTextActive: { color: c.text },
  calHint: { fontSize: text.sm, color: c.textFaint, textAlign: 'center', paddingVertical: space[6] },
  dayLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'capitalize' },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  apptRowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  typeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  apptBody: { flex: 1, gap: 2 },
  apptTitle: { fontSize: text.md, fontWeight: weight.semibold, color: c.text },
  apptMeta: { fontSize: text.xs, color: c.textFaint, textTransform: 'capitalize' },
  apptTime: { fontSize: text.sm, color: c.text, fontWeight: weight.bold, width: 46, fontVariant: ['tabular-nums'] },
  chip: { borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: c.surfaceAlt },
  chipActive: { backgroundColor: c.brand },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  chipTextActive: { color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  typeBtn: { borderRadius: radius.md, paddingVertical: space[2], paddingHorizontal: space[3], backgroundColor: c.surfaceAlt },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  errorText: { fontSize: text.sm, color: colors.red500 },
});

import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Pressable,
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
import { EventRowSkeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight } from '../../styles/tokens';
import { useCommonStyles } from '../../styles/common';
import { useToast } from '../../components/Toast';

const TYPE_OPTIONS = Object.entries(APPOINTMENT_TYPES);

function AppointmentCard({
  appt,
  onComplete,
  onDelete,
  c,
  s,
}: {
  appt: ReturnType<typeof useAgenda>['data'] extends (infer T)[] | undefined ? T : never;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  c: ThemeColors;
  s: Styles;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (!appt) return null;
  const meta = APPOINTMENT_TYPES[appt.type] ?? APPOINTMENT_TYPES.otro;
  const date = new Date(appt.scheduled_at);
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[s.apptCard, appt.completed && { opacity: 0.5 }]}>
      <View style={s.apptRow}>
        <View style={[s.typeDot, { backgroundColor: c.isDark ? meta.color + '26' : meta.bg }]}>
          <Text style={[s.typeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MoreVertical size={18} color={c.textFaint} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <Text style={s.apptTitle}>{appt.title}</Text>
      {appt.horse && <Text style={s.apptHorse}>{appt.horse.name}</Text>}
      <View style={s.apptDateRow}>
        <Clock size={13} color={c.textFaint} strokeWidth={2} />
        <Text style={s.apptTime}>{timeStr}</Text>
      </View>
      {appt.completed && (
        <View style={s.completedRow}>
          <Check size={13} color="#16a34a" strokeWidth={2.5} />
          <Text style={s.completedText}>Completado</Text>
        </View>
      )}

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={s.apptMenuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={s.apptMenu}>
            {!appt.completed && (
              <>
                <TouchableOpacity
                  style={s.apptMenuItem}
                  onPress={() => { setMenuOpen(false); onComplete(appt.id); }}
                  activeOpacity={0.7}
                >
                  <Check size={18} color={c.text} strokeWidth={2.5} />
                  <Text style={s.apptMenuText}>Marcar como completado</Text>
                </TouchableOpacity>
                <View style={s.apptMenuDivider} />
              </>
            )}
            <TouchableOpacity
              style={s.apptMenuItem}
              onPress={() => { setMenuOpen(false); onDelete(appt.id); }}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color={colors.red500} strokeWidth={2} />
              <Text style={[s.apptMenuText, { color: colors.red500 }]}>Eliminar turno</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function CreateModal({ onClose, c, s }: { onClose: () => void; c: ThemeColors; s: Styles }) {
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

  const handleSubmit = async () => {
    if (!horseId || !title.trim() || !date) { setError('Completá todos los campos obligatorios'); return; }
    setError('');
    const dt = new Date(date + 'T12:00:00');
    dt.setHours(timeDate.getHours(), timeDate.getMinutes());
    await create.mutateAsync({ horse_id: horseId, type, title, scheduled_at: dt.toISOString(), notes: notes || undefined });
    toast.success('Turno agendado');
    onClose();
  };

  return (
    <KeyboardAvoidingView style={modalStyle.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Animated.View style={[modalStyle.sheet, { maxHeight: '92%' }]} entering={SlideInDown.springify().damping(26).stiffness(190)}>
        <View style={modalStyle.header}>
          <Text style={modalStyle.title}>Nuevo turno</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}><X size={22} color={c.textMuted} strokeWidth={2} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[modalStyle.body, { gap: space[4] }]}>
          {/* Caballo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Caballo *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
              {horses?.map((h) => (
                <TouchableOpacity key={h.id}
                  style={[s.chip, horseId === h.id && s.chipActive]}
                  onPress={() => setHorseId(h.id)}
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
                  onPress={() => setType(v)}
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
              onPress={() => setShowTimePicker(true)}
              style={[inputStyle.base, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            >
              <Text style={{ fontSize: 15, color: c.text }}>{timeStr}</Text>
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
        </ScrollView>
        <View style={modalStyle.footer}>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={onClose}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[button.primary, { flex: 1 }, create.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={create.isPending}
          >
            {create.isPending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={button.primaryText}>Crear turno</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
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
  const { data: appointments, isLoading, refetch, isRefetching } = useAgenda(viewMode === 'list' ? upcoming : false);
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
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteAppt.mutate(id) },
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
      {viewMode === 'calendar' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: space[8] }}
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
          <View style={{ paddingHorizontal: space[4], gap: space[2], marginTop: space[2] }}>
            {!selectedDay ? (
              <Text style={s.calHint}>Tocá un día para ver sus turnos</Text>
            ) : dayAppts.length === 0 ? (
              <Text style={s.calHint}>Sin turnos para este día</Text>
            ) : (
              dayAppts.map((appt, index) => (
                <Animated.View key={appt.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
                  <AppointmentCard appt={appt} onComplete={(id) => complete.mutate(id)} onDelete={handleDelete} c={c} s={s} />
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
          contentContainerStyle={{ paddingBottom: space[8], gap: space[5] }}
          renderItem={({ item: [day, items], index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)} style={{ gap: space[2], paddingHorizontal: space[4] }}>
              <Text style={s.dayLabel}>{day}</Text>
              {(items ?? []).map((appt) => appt ? (
                <AppointmentCard key={appt.id} appt={appt}
                  onComplete={(id) => complete.mutate(id)}
                  onDelete={handleDelete}
                  c={c} s={s}
                />
              ) : null)}
            </Animated.View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showCreate} animationType="fade" transparent statusBarTranslucent>
        <CreateModal onClose={() => setShowCreate(false)} c={c} s={s} />
      </Modal>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingTop: space[1], paddingBottom: space[2], gap: space[2] },
  toggle: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.full, padding: 3 },
  toggleBtn: { paddingVertical: space[1] + 1, paddingHorizontal: space[4], alignItems: 'center', borderRadius: radius.full },
  toggleBtnActive: { backgroundColor: c.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  toggleTextActive: { color: c.text },
  viewToggle: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: radius.full, padding: 3 },
  viewBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: space[1] + 2, paddingHorizontal: space[4], borderRadius: radius.full },
  viewBtnActive: { backgroundColor: c.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  viewText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  viewTextActive: { color: c.text },
  calHint: { fontSize: text.sm, color: c.textFaint, textAlign: 'center', paddingVertical: space[6] },
  dayLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'capitalize' },
  apptCard: { backgroundColor: c.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: c.border, padding: space[4], gap: space[2], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  apptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeDot: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { fontSize: text.xs, fontWeight: weight.semibold },
  apptActions: { flexDirection: 'row', gap: space[3] },
  completeBtn: { fontSize: 18, color: '#16a34a' },
  deleteBtn: { fontSize: 16, color: c.textFaint },
  apptTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  apptHorse: { fontSize: text.xs, color: c.textFaint },
  apptDateRow: { flexDirection: 'row', gap: space[2] },
  apptDate: { fontSize: text.xs, color: c.textMuted },
  apptTime: { fontSize: text.sm, color: c.text, fontWeight: weight.bold },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  completedText: { fontSize: text.xs, color: '#16a34a', fontWeight: weight.semibold },
  apptMenuOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space[8] },
  apptMenu: { backgroundColor: c.surface, borderRadius: radius.xl, width: '100%', maxWidth: 340, paddingVertical: space[1], shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12 },
  apptMenuItem: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3] + 2 },
  apptMenuText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  apptMenuDivider: { height: 1, backgroundColor: c.border, marginHorizontal: space[2] },
  chip: { borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: c.surfaceAlt },
  chipActive: { backgroundColor: c.brand },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  chipTextActive: { color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  typeBtn: { borderRadius: radius.md, paddingVertical: space[2], paddingHorizontal: space[3], backgroundColor: c.surfaceAlt },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  errorText: { fontSize: text.sm, color: colors.red500 },
});

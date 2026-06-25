import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, X, Clock, List, CalendarDays } from 'lucide-react-native';
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
import { space, text, radius, weight } from '../../styles/tokens';
import { layout, typography, card, modal as modalStyle, button, input as inputStyle } from '../../styles/common';

const TYPE_OPTIONS = Object.entries(APPOINTMENT_TYPES);

function AppointmentCard({
  appt,
  onComplete,
  onDelete,
}: {
  appt: ReturnType<typeof useAgenda>['data'] extends (infer T)[] | undefined ? T : never;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!appt) return null;
  const meta = APPOINTMENT_TYPES[appt.type] ?? APPOINTMENT_TYPES.otro;
  const date = new Date(appt.scheduled_at);
  const timeStr = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[styles.apptCard, appt.completed && { opacity: 0.5 }]}>
      <View style={styles.apptRow}>
        <View style={[styles.typeDot, { backgroundColor: meta.bg }]}>
          <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <View style={styles.apptActions}>
          {!appt.completed && (
            <TouchableOpacity onPress={() => onComplete(appt.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Check size={18} color={colors.gray400} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onDelete(appt.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={17} color={colors.gray300} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.apptTitle}>{appt.title}</Text>
      {appt.horse && <Text style={styles.apptHorse}>{appt.horse.name}</Text>}
      <View style={styles.apptDateRow}>
        <Clock size={13} color={colors.gray400} strokeWidth={2} />
        <Text style={styles.apptTime}>{timeStr}</Text>
      </View>
      {appt.completed && <Text style={styles.completedText}>✓ Completado</Text>}
    </View>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const { data: horses } = useHorses();
  const create = useCreateAppointment();
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
    onClose();
  };

  return (
    <KeyboardAvoidingView style={modalStyle.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[modalStyle.sheet, { maxHeight: '92%' }]}>
        <View style={modalStyle.header}>
          <Text style={modalStyle.title}>Nuevo turno</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}><X size={22} color={colors.gray500} strokeWidth={2} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[modalStyle.body, { gap: space[4] }]}>
          {/* Caballo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Caballo *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
              {horses?.map((h) => (
                <TouchableOpacity key={h.id}
                  style={[styles.chip, horseId === h.id && styles.chipActive]}
                  onPress={() => setHorseId(h.id)}
                >
                  <Text style={[styles.chipText, horseId === h.id && styles.chipTextActive]}>{h.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tipo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Tipo</Text>
            <View style={styles.typeGrid}>
              {TYPE_OPTIONS.map(([v, m]) => (
                <TouchableOpacity key={v}
                  style={[styles.typeBtn, type === v && { backgroundColor: m.bg }]}
                  onPress={() => setType(v)}
                >
                  <Text style={[styles.typeBtnText, type === v && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Título */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Título *</Text>
            <TextInput style={inputStyle.base} value={title} onChangeText={setTitle} placeholder="Ej: Control anual" placeholderTextColor={colors.gray400} />
          </View>

          {/* Fecha y hora */}
          <DatePicker label="Fecha *" value={date} onChange={setDate} />
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Hora</Text>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              style={[inputStyle.base, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            >
              <Text style={{ fontSize: 15, color: colors.gray900 }}>{timeStr}</Text>
              <Clock size={18} color={colors.gray400} strokeWidth={2} />
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
            <TextInput style={inputStyle.multiline} value={notes} onChangeText={setNotes} multiline placeholder="Observaciones..." placeholderTextColor={colors.gray400} />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
      </View>
    </KeyboardAvoidingView>
  );
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
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
      <View style={styles.toolbar}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => { haptic.selection(); setViewMode('list'); }}
            activeOpacity={0.85}
          >
            <List size={15} color={viewMode === 'list' ? colors.gray900 : colors.gray500} strokeWidth={2.2} />
            <Text style={[styles.viewText, viewMode === 'list' && styles.viewTextActive]}>Lista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'calendar' && styles.viewBtnActive]}
            onPress={() => { haptic.selection(); setViewMode('calendar'); }}
            activeOpacity={0.85}
          >
            <CalendarDays size={15} color={viewMode === 'calendar' ? colors.gray900 : colors.gray500} strokeWidth={2.2} />
            <Text style={[styles.viewText, viewMode === 'calendar' && styles.viewTextActive]}>Mes</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'list' && (
          <View style={styles.toggle}>
            {(['upcoming', 'all'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.toggleBtn, upcoming === (v === 'upcoming') && styles.toggleBtnActive]}
                onPress={() => { haptic.selection(); setUpcoming(v === 'upcoming'); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleText, upcoming === (v === 'upcoming') && styles.toggleTextActive]}>
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
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
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
              <Text style={styles.calHint}>Tocá un día para ver sus turnos</Text>
            ) : dayAppts.length === 0 ? (
              <Text style={styles.calHint}>Sin turnos para este día</Text>
            ) : (
              dayAppts.map((appt, index) => (
                <Animated.View key={appt.id} entering={FadeInDown.duration(300).delay(Math.min(index, 8) * 40)}>
                  <AppointmentCard appt={appt} onComplete={(id) => complete.mutate(id)} onDelete={handleDelete} />
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
              <Text style={styles.dayLabel}>{day}</Text>
              {(items ?? []).map((appt) => appt ? (
                <AppointmentCard key={appt.id} appt={appt}
                  onComplete={(id) => complete.mutate(id)}
                  onDelete={handleDelete}
                />
              ) : null)}
            </Animated.View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showCreate} animationType="slide" transparent>
        <CreateModal onClose={() => setShowCreate(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4], paddingTop: space[1], paddingBottom: space[2], gap: space[2] },
  toggle: { flexDirection: 'row', backgroundColor: colors.gray100, borderRadius: radius.full, padding: 3 },
  toggleBtn: { paddingVertical: space[1] + 1, paddingHorizontal: space[4], alignItems: 'center', borderRadius: radius.full },
  toggleBtnActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  toggleText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray500 },
  toggleTextActive: { color: colors.gray900 },
  viewToggle: { flexDirection: 'row', backgroundColor: colors.gray100, borderRadius: radius.full, padding: 3 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: space[1] + 2, paddingVertical: space[1] + 1, paddingHorizontal: space[4], borderRadius: radius.full },
  viewBtnActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  viewText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray500 },
  viewTextActive: { color: colors.gray900 },
  calHint: { fontSize: text.sm, color: colors.gray400, textAlign: 'center', paddingVertical: space[6] },
  dayLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray400, textTransform: 'capitalize' },
  apptCard: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gray100, padding: space[4], gap: space[2], shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  apptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeDot: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  typeText: { fontSize: text.xs, fontWeight: weight.semibold },
  apptActions: { flexDirection: 'row', gap: space[3] },
  completeBtn: { fontSize: 18, color: '#16a34a' },
  deleteBtn: { fontSize: 16, color: colors.gray300 },
  apptTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray900 },
  apptHorse: { fontSize: text.xs, color: colors.gray400 },
  apptDateRow: { flexDirection: 'row', gap: space[2] },
  apptDate: { fontSize: text.xs, color: colors.gray500 },
  apptTime: { fontSize: text.sm, color: colors.gray900, fontWeight: weight.bold },
  completedText: { fontSize: text.xs, color: '#16a34a', fontWeight: weight.semibold },
  chip: { borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: colors.gray100 },
  chipActive: { backgroundColor: colors.brand },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  chipTextActive: { color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  typeBtn: { borderRadius: radius.md, paddingVertical: space[2], paddingHorizontal: space[3], backgroundColor: colors.gray100 },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray600 },
  errorText: { fontSize: text.sm, color: colors.red500 },
});

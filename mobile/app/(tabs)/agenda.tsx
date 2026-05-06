import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgenda, useCreateAppointment, useCompleteAppointment, useDeleteAppointment, APPOINTMENT_TYPES } from '../../hooks/use-agenda';
import { useHorses } from '../../hooks/use-horses';
import { DatePicker } from '../../components/DatePicker';
import { Spinner } from '../../components/Spinner';
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
  const dateStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
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
              <Text style={styles.completeBtn}>✓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onDelete(appt.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.apptTitle}>{appt.title}</Text>
      {appt.horse && <Text style={styles.apptHorse}>{appt.horse.name}</Text>}
      <View style={styles.apptDateRow}>
        <Text style={styles.apptDate}>{dateStr}</Text>
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
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!horseId || !title.trim() || !date) { setError('Completá todos los campos obligatorios'); return; }
    setError('');
    const [h, m] = time.split(':');
    const dt = new Date(date + 'T12:00:00');
    dt.setHours(parseInt(h), parseInt(m));
    await create.mutateAsync({ horse_id: horseId, type, title, scheduled_at: dt.toISOString(), notes: notes || undefined });
    onClose();
  };

  return (
    <KeyboardAvoidingView style={modalStyle.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[modalStyle.sheet, { maxHeight: '92%' }]}>
        <View style={modalStyle.header}>
          <Text style={modalStyle.title}>Nuevo turno</Text>
          <TouchableOpacity onPress={onClose}><Text style={modalStyle.closeText}>✕</Text></TouchableOpacity>
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
            <TextInput style={inputStyle.base} value={time} onChangeText={setTime} placeholder="09:00" placeholderTextColor={colors.gray400} keyboardType="numbers-and-punctuation" />
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
  const { data: appointments, isLoading, refetch, isRefetching } = useAgenda(upcoming);
  const complete = useCompleteAppointment();
  const deleteAppt = useDeleteAppointment();

  const grouped = (appointments ?? []).reduce<Record<string, typeof appointments>>((acc, a) => {
    if (!a) return acc;
    const day = new Date(a.scheduled_at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    return { ...acc, [day]: [...(acc[day] ?? []), a] };
  }, {});

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar turno', '¿Querés eliminar este turno?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteAppt.mutate(id) },
    ]);
  };

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={typography.pageTitle}>Agenda</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.newBtnText}>+ Turno</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={styles.toggle}>
        {(['upcoming', 'all'] as const).map((v) => (
          <TouchableOpacity key={v} style={[styles.toggleBtn, upcoming === (v === 'upcoming') && styles.toggleBtnActive]}
            onPress={() => setUpcoming(v === 'upcoming')}
          >
            <Text style={[styles.toggleText, upcoming === (v === 'upcoming') && styles.toggleTextActive]}>
              {v === 'upcoming' ? 'Próximos' : 'Todos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? <Spinner /> : !Object.keys(grouped).length ? (
        <View style={layout.center}>
          <Text style={typography.caption}>{upcoming ? 'No hay turnos próximos' : 'No hay turnos registrados'}</Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(grouped)}
          keyExtractor={([day]) => day}
          contentContainerStyle={{ padding: space[4], paddingBottom: space[8], gap: space[5] }}
          renderItem={({ item: [day, items] }) => (
            <View style={{ gap: space[2] }}>
              <Text style={styles.dayLabel}>{day}</Text>
              {(items ?? []).map((appt) => appt ? (
                <AppointmentCard key={appt.id} appt={appt}
                  onComplete={(id) => complete.mutate(id)}
                  onDelete={handleDelete}
                />
              ) : null)}
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[1] },
  newBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[2] },
  newBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  toggle: { flexDirection: 'row', marginHorizontal: space[4], marginBottom: space[2], borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden' },
  toggleBtn: { flex: 1, paddingVertical: space[2], alignItems: 'center', backgroundColor: colors.white },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray500 },
  toggleTextActive: { color: colors.white },
  dayLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray400, textTransform: 'capitalize' },
  apptCard: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray100, padding: space[3], gap: space[1] + 2 },
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
  apptTime: { fontSize: text.xs, color: colors.primary, fontWeight: weight.semibold },
  completedText: { fontSize: text.xs, color: '#16a34a', fontWeight: weight.semibold },
  chip: { borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[2], backgroundColor: colors.gray100 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  chipTextActive: { color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  typeBtn: { borderRadius: radius.md, paddingVertical: space[2], paddingHorizontal: space[3], backgroundColor: colors.gray100 },
  typeBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray600 },
  errorText: { fontSize: text.sm, color: colors.red500 },
});

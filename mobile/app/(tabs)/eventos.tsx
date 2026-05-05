import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAllEvents, useCreateEvent, useDeleteEvent } from '../../hooks/use-events';
import { useHorses } from '../../hooks/use-horses';
import { useAuth } from '../../lib/auth';
import { Spinner } from '../../components/Spinner';
import { EventTypeBadge } from '../../components/EventTypeBadge';
import { colors, eventTypeColors } from '../../lib/colors';
import type { Event } from '../../../packages/shared/src';

const TYPE_OPTIONS = ['salud', 'entrenamiento', 'gasto', 'nota'] as const;

function EventCard({
  event,
  canDelete,
  onDelete,
}: {
  event: Event;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  const date = new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <EventTypeBadge type={event.type} />
          {event.horse && <Text style={styles.horseName}>{event.horse.name}</Text>}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.dateText}>{date}</Text>
          {canDelete && (
            <TouchableOpacity onPress={() => onDelete(event.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.deleteBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {event.amount != null && (
        <Text style={styles.amount}>${Number(event.amount).toLocaleString('es-AR')}</Text>
      )}
      <Text style={styles.desc}>{event.description}</Text>
    </View>
  );
}

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const { data: horses } = useHorses();
  const createEvent = useCreateEvent();
  const [horseId, setHorseId] = useState(horses?.[0]?.id ?? '');
  const [type, setType] = useState<string>('salud');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!horseId) { setError('Seleccioná un caballo'); return; }
    if (!description.trim()) { setError('Escribí una descripción'); return; }
    setError('');
    await createEvent.mutateAsync({
      type, description, date, horse_id: horseId,
      amount: type === 'gasto' && amount ? amount : undefined,
    });
    onClose();
  };

  return (
    <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nuevo evento</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Caballo */}
          <Text style={styles.fieldLabel}>Caballo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {horses?.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.chip, horseId === h.id && styles.chipActive]}
                onPress={() => setHorseId(h.id)}
              >
                <Text style={[styles.chipText, horseId === h.id && styles.chipTextActive]}>{h.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tipo */}
          <Text style={styles.fieldLabel}>Tipo</Text>
          <View style={styles.typeGrid}>
            {TYPE_OPTIONS.map((t) => {
              const c = eventTypeColors[t];
              const active = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, active && { backgroundColor: c.bg }]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeBtnText, active && { color: c.text }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fecha */}
          <Text style={styles.fieldLabel}>Fecha (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2025-01-15"
            placeholderTextColor={colors.gray400}
          />

          {/* Monto */}
          {type === 'gasto' && (
            <>
              <Text style={styles.fieldLabel}>Monto ($)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {/* Descripción */}
          <Text style={styles.fieldLabel}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detalle del evento..."
            placeholderTextColor={colors.gray400}
            multiline
            numberOfLines={3}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, createEvent.isPending && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={createEvent.isPending}
          >
            {createEvent.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.submitBtnText}>Crear evento</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function EventosScreen() {
  const { can } = useAuth();
  const insets = useSafeAreaInsets();
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: events, isLoading, refetch, isRefetching } = useAllEvents(
    filterType ? { type: filterType } : undefined,
  );
  const deleteEvent = useDeleteEvent();

  const canCreate = can('events', 'create');
  const canDelete = can('events', 'delete');

  if (isLoading) return <Spinner />;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Eventos</Text>
        {canCreate && (
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.newBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtro tipo */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {(['', ...TYPE_OPTIONS] as string[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, filterType === t && styles.filterChipActive]}
            onPress={() => setFilterType(t)}
          >
            <Text style={[styles.filterChipText, filterType === t && styles.filterChipTextActive]}>
              {t === '' ? 'Todos' : eventTypeColors[t]?.label ?? t}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista */}
      {!events?.length ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No hay eventos{filterType ? ` de tipo ${eventTypeColors[filterType]?.label}` : ''}</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              canDelete={canDelete}
              onDelete={(id) => deleteEvent.mutate(id)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal crear */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <CreateEventModal onClose={() => setShowCreate(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: colors.gray900 },
  newBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  filterBar: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  filterChip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  filterChipTextActive: { color: colors.white },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.gray100, padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  horseName: { fontSize: 12, color: colors.gray400, fontWeight: '500' },
  dateText: { fontSize: 11, color: colors.gray400 },
  deleteBtn: { fontSize: 14, color: colors.gray300 },
  amount: { fontSize: 14, fontWeight: '700', color: colors.purple700 },
  desc: { fontSize: 14, color: colors.gray700, lineHeight: 20 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: colors.gray400, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalClose: { fontSize: 18, color: colors.gray400 },
  modalBody: { padding: 20, gap: 12 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  horizontalScroll: { maxHeight: 40 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.gray100, marginRight: 8 },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  chipTextActive: { color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { flex: 1, minWidth: '45%', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.gray100 },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50 },
  textarea: { height: 80, textAlignVertical: 'top' },
  errorText: { fontSize: 13, color: colors.red500 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  submitBtn: { flex: 1, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 13, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  btnDisabled: { opacity: 0.6 },
});

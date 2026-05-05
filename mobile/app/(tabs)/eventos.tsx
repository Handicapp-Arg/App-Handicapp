'use client';
import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAllEvents, useCreateEvent, useDeleteEvent } from '../../hooks/use-events';
import { useHorses } from '../../hooks/use-horses';
import { useAuth } from '../../lib/auth';
import { DatePicker } from '../../components/DatePicker';
import { EventCard } from '../../components/EventCard';
import { Spinner } from '../../components/Spinner';
import { colors, eventTypeColors } from '../../lib/colors';
import { space, text, radius, weight } from '../../styles/tokens';
import { layout, typography, input as inputStyle, modal as modalStyle, button } from '../../styles/common';

const TYPE_OPTIONS = ['salud', 'entrenamiento', 'gasto', 'nota'] as const;

/* ─── Modal crear evento ─── */

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
    <KeyboardAvoidingView style={modalStyle.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={modalStyle.sheet}>
        {/* Header */}
        <View style={modalStyle.header}>
          <Text style={modalStyle.title}>Nuevo evento</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={modalStyle.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={[modalStyle.body, { gap: space[4] }]}>
          {/* Caballo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Caballo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space[2] }}>
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
          </View>

          {/* Tipo */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Tipo</Text>
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
          </View>

          {/* Fecha */}
          <DatePicker label="Fecha" value={date} onChange={setDate} maxDate={new Date()} />

          {/* Monto */}
          {type === 'gasto' && (
            <View style={{ gap: space[2] }}>
              <Text style={typography.label}>Monto ($)</Text>
              <TextInput
                style={inputStyle.base}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.gray400}
                keyboardType="decimal-pad"
              />
            </View>
          )}

          {/* Descripción */}
          <View style={{ gap: space[2] }}>
            <Text style={typography.label}>Descripción</Text>
            <TextInput
              style={inputStyle.multiline}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalle del evento..."
              placeholderTextColor={colors.gray400}
              multiline
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        {/* Footer */}
        <View style={modalStyle.footer}>
          <TouchableOpacity style={[button.secondary, { flex: 1 }]} onPress={onClose}>
            <Text style={button.secondaryText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[button.primary, { flex: 1 }, createEvent.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createEvent.isPending}
          >
            {createEvent.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={button.primaryText}>Crear evento</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ─── Pantalla principal ─── */

export default function EventosScreen() {
  const { can } = useAuth();
  const insets = useSafeAreaInsets();
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { events, isLoading, isFetchingMore, hasMore, loadMore, reset, refetch, total } = useAllEvents(
    filterType ? { type: filterType } : undefined,
  );
  const deleteEvent = useDeleteEvent();
  const canCreate = can('events', 'create');
  const canDelete = can('events', 'delete');

  useEffect(() => { reset(); }, [filterType]);

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.pageTitle}>Eventos</Text>
        {canCreate && (
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.newBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 48 }}
      >
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

      {/* Contador */}
      {total > 0 && (
        <Text style={styles.counter}>{events.length} de {total}</Text>
      )}

      {/* Lista */}
      {isLoading ? <Spinner /> : !events.length ? (
        <View style={layout.center}>
          <Text style={typography.caption}>
            No hay eventos{filterType ? ` de tipo ${eventTypeColors[filterType]?.label}` : ''}
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              showHorse
              onDelete={canDelete ? (id) => deleteEvent.mutate(id) : undefined}
            />
          )}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : !hasMore && total > 0 ? (
              <View style={styles.footer}>
                <Text style={typography.caption}>— {total} eventos en total —</Text>
              </View>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showCreate} animationType="slide" transparent>
        <CreateEventModal onClose={() => setShowCreate(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[1],
  },
  newBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: space[4], paddingVertical: space[2] },
  newBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  filterRow: { paddingHorizontal: space[4], paddingVertical: space[2], gap: space[2] },
  filterChip: {
    borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[1] + 2,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: text.xs, fontWeight: weight.semibold, color: colors.gray600 },
  filterChipTextActive: { color: colors.white },
  counter: { fontSize: text.xs, color: colors.gray400, paddingHorizontal: space[4], paddingBottom: space[1] },
  list: { padding: space[4], paddingBottom: space[8] },
  footer: { padding: space[5], alignItems: 'center' },
  // Modal form
  chip: {
    borderRadius: radius.full, paddingHorizontal: space[4], paddingVertical: space[2],
    backgroundColor: colors.gray100,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray700 },
  chipTextActive: { color: colors.white },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  typeBtn: {
    flex: 1, minWidth: '45%', borderRadius: radius.md,
    paddingVertical: space[2] + 2, alignItems: 'center', backgroundColor: colors.gray100,
  },
  typeBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.gray600 },
  errorText: { fontSize: text.sm, color: colors.red500 },
});

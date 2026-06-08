import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, RefreshControl, Modal, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useHorses, useCreateHorse } from '../../../hooks/use-horses';
import { DatePicker } from '../../../components/DatePicker';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { HorseCardSkeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import type { Horse } from '../../../../packages/shared/src';

function HorseCard({ horse }: { horse: Horse }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => { haptic.light(); router.push(`/(tabs)/caballos/${horse.id}`); }}
      activeOpacity={0.85}
    >
      <View style={styles.imgWrap}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={styles.img} resizeMode="cover" />
          : (
            <View style={styles.imgPlaceholder}>
              <Text style={styles.imgPlaceholderText}>{horse.name[0]?.toUpperCase()}</Text>
            </View>
          )
        }
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.imgFooter}>
          <Text style={styles.imgName} numberOfLines={1}>{horse.name}</Text>
          {horse.breed && <Text style={styles.imgBreed} numberOfLines={1}>{horse.breed.name}</Text>}
        </View>
        {horse.activity && (
          <View style={styles.activityBadge}>
            <Text style={styles.activityText}>{horse.activity.name}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardFooter}>
        {horse.establishment
          ? <>
              <Ionicons name="business-outline" size={11} color={colors.gray400} />
              <Text style={styles.cardSub} numberOfLines={1}>{horse.establishment.name}</Text>
            </>
          : <Text style={styles.cardSubEmpty}>Sin establecimiento</Text>
        }
        <View style={styles.arrowWrap}>
          <Ionicons name="chevron-forward" size={11} color={colors.gray300} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CreateHorseModal({ onClose }: { onClose: () => void }) {
  const createHorse = useCreateHorse();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    setError('');
    await createHorse.mutateAsync({
      name: name.trim(),
      birth_date: birthDate || undefined,
      microchip: microchip || undefined,
    });
    onClose();
  };

  return (
    <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.modalCard}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Nuevo caballo</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.fieldLabel}>Nombre *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nombre del caballo"
            placeholderTextColor={colors.gray400}
            autoCapitalize="words"
          />
          <DatePicker
            label="Fecha de nacimiento (opcional)"
            value={birthDate}
            onChange={setBirthDate}
            maxDate={new Date()}
          />
          <Text style={styles.fieldLabel}>Microchip (15 dígitos, opcional)</Text>
          <TextInput
            style={styles.input}
            value={microchip}
            onChangeText={(v) => setMicrochip(v.replace(/\D/g, '').slice(0, 15))}
            placeholder="123456789012345"
            placeholderTextColor={colors.gray400}
            keyboardType="numeric"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {createHorse.isError ? <Text style={styles.errorText}>No se pudo crear el caballo.</Text> : null}
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, createHorse.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={createHorse.isPending}
          >
            {createHorse.isPending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.submitBtnText}>Crear</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function CaballosScreen() {
  const { can } = useAuth();
  const { data: horses, isLoading, refetch, isRefetching } = useHorses();
  const [search, setSearch] = useState('');
  const [filterActivity, setFilterActivity] = useState('');
  const [filterEstab, setFilterEstab] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const insets = useSafeAreaInsets();

  // Opciones de filtro dinámicas según los datos disponibles
  const activityOptions = [...new Set((horses ?? []).map((h) => h.activity?.name).filter(Boolean))] as string[];
  const estabOptions = [...new Set((horses ?? []).map((h) => h.establishment?.name).filter(Boolean))] as string[];
  const hasFilters = activityOptions.length > 1 || estabOptions.length > 1;

  const filtered = (horses ?? []).filter((h) => {
    const q = search.toLowerCase();
    const matchSearch = !search || (
      h.name.toLowerCase().includes(q) ||
      (h.breed?.name ?? '').toLowerCase().includes(q) ||
      (h.microchip ?? '').includes(q)
    );
    const matchActivity = !filterActivity || h.activity?.name === filterActivity;
    const matchEstab = !filterEstab || h.establishment?.name === filterEstab;
    return matchSearch && matchActivity && matchEstab;
  });

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader
          title="Caballos"
          right={can('horses', 'create') ? <HeaderButton label="+ Nuevo" onPress={() => setShowCreate(true)} /> : undefined}
        />
        <View style={styles.skeletonGrid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flex: 1, maxWidth: '50%' }}>
              <HorseCardSkeleton />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={`Caballos${horses?.length ? ` (${horses.length})` : ''}`}
        right={can('horses', 'create') ? (
          <HeaderButton label="+ Nuevo" onPress={() => { haptic.medium(); setShowCreate(true); }} />
        ) : undefined}
      />

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.gray400} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, raza..."
          placeholderTextColor={colors.gray400}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={colors.gray300} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros por actividad y establecimiento */}
      {hasFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={{ maxHeight: 44 }}
        >
          {activityOptions.map((act) => (
            <TouchableOpacity
              key={act}
              style={[styles.filterChip, filterActivity === act && styles.filterChipActive]}
              onPress={() => { haptic.selection(); setFilterActivity(filterActivity === act ? '' : act); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterChipText, filterActivity === act && styles.filterChipTextActive]}>{act}</Text>
            </TouchableOpacity>
          ))}
          {estabOptions.map((est) => (
            <TouchableOpacity
              key={est}
              style={[styles.filterChip, filterEstab === est && styles.filterChipActive]}
              onPress={() => { haptic.selection(); setFilterEstab(filterEstab === est ? '' : est); }}
              activeOpacity={0.75}
            >
              <Ionicons name="business-outline" size={11} color={filterEstab === est ? colors.white : colors.gray500} />
              <Text style={[styles.filterChipText, filterEstab === est && styles.filterChipTextActive]}>{est}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={search ? 'search-outline' : 'paw-outline'}
          title={search ? 'Sin resultados' : 'No hay caballos registrados'}
          message={search ? `No encontramos resultados para "${search}"` : 'Registrá el primer caballo para empezar a gestionar su historial.'}
          actionLabel={!search && can('horses', 'create') ? 'Registrar caballo' : undefined}
          onAction={() => { haptic.medium(); setShowCreate(true); }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <HorseCard horse={item} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <CreateHorseModal onClose={() => setShowCreate(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f2f5' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: colors.gray100, borderRadius: 14,
    borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 12, paddingVertical: 2, gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.gray900 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 12 },
  list: { padding: 12, paddingBottom: 32, gap: 12 },
  row: { gap: 12 },
  // Card mejorada
  card: {
    flex: 1, backgroundColor: colors.white, borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  imgWrap: { position: 'relative', aspectRatio: 1 },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, backgroundColor: '#e8ecf4', justifyContent: 'center', alignItems: 'center' },
  imgPlaceholderText: { fontSize: 36, fontWeight: '800', color: colors.primary, opacity: 0.4 },
  imgFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10, paddingTop: 28 },
  imgName: { fontSize: 14, fontWeight: '800', color: colors.white, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  imgBreed: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  activityBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(15,31,61,0.75)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  activityText: { fontSize: 10, fontWeight: '700', color: colors.white },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.gray100 },
  cardSub: { fontSize: 11, color: colors.gray400, flex: 1 },
  cardSubEmpty: { fontSize: 11, color: colors.gray300, flex: 1, fontStyle: 'italic' },
  arrowWrap: { marginLeft: 'auto' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  filterChipTextActive: { color: colors.white },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalClose: { fontSize: 18, color: colors.gray400 },
  modalBody: { padding: 20, gap: 10 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.gray900, backgroundColor: colors.gray50 },
  errorText: { fontSize: 13, color: colors.red500 },
  cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  submitBtn: { flex: 1, borderRadius: 12, backgroundColor: colors.primary, paddingVertical: 13, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
});

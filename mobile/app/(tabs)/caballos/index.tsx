import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, RefreshControl, Modal, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorses, useCreateHorse } from '../../../hooks/use-horses';
import { useAuth } from '../../../lib/auth';
import { Spinner } from '../../../components/Spinner';
import { colors } from '../../../lib/colors';
import type { Horse } from '../../../../packages/shared/src';

function HorseCard({ horse }: { horse: Horse }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(tabs)/caballos/${horse.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.imgWrap}>
        {horse.image_url
          ? <Image source={{ uri: horse.image_url }} style={styles.img} resizeMode="cover" />
          : (
            <View style={styles.imgPlaceholder}>
              <Text style={styles.imgPlaceholderText}>{horse.name[0]}</Text>
            </View>
          )
        }
        {horse.breed && (
          <View style={styles.breedBadge}>
            <Text style={styles.breedText}>{horse.breed.name}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{horse.name}</Text>
        {horse.activity && (
          <View style={styles.activityBadge}>
            <Text style={styles.activityText}>{horse.activity.name}</Text>
          </View>
        )}
        {horse.establishment && (
          <Text style={styles.cardSub} numberOfLines={1}>{horse.establishment.name}</Text>
        )}
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
          <Text style={styles.fieldLabel}>Fecha de nacimiento (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="2020-05-15"
            placeholderTextColor={colors.gray400}
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
  const [showCreate, setShowCreate] = useState(false);
  const insets = useSafeAreaInsets();

  const filtered = search
    ? (horses ?? []).filter((h) =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.breed?.name.toLowerCase().includes(search.toLowerCase()) ||
        h.microchip?.includes(search)
      )
    : (horses ?? []);

  if (isLoading) return <Spinner />;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.title}>Caballos</Text>
          {horses && horses.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{horses.length}</Text>
            </View>
          )}
        </View>
        {can('horses', 'create') && (
          <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.newBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Buscador */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, raza..."
          placeholderTextColor={colors.gray400}
          clearButtonMode="while-editing"
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {search ? 'Sin resultados para esa búsqueda' : 'No hay caballos registrados'}
          </Text>
        </View>
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
  root: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: colors.gray900 },
  countBadge: { backgroundColor: colors.emerald50, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, fontWeight: '700', color: colors.emerald700 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: 12, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.gray900 },
  list: { padding: 12, paddingBottom: 32, gap: 12 },
  row: { gap: 12 },
  card: {
    flex: 1, backgroundColor: colors.white, borderRadius: 18,
    borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden',
  },
  imgWrap: { position: 'relative', aspectRatio: 4 / 3 },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: {
    flex: 1, backgroundColor: colors.gray100,
    justifyContent: 'center', alignItems: 'center',
  },
  imgPlaceholderText: { fontSize: 32, fontWeight: '700', color: colors.gray400 },
  breedBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: 'rgba(15,31,61,0.7)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  breedText: { fontSize: 10, fontWeight: '600', color: colors.white },
  cardBody: { padding: 10, gap: 4 },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  activityBadge: { backgroundColor: colors.amber50, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  activityText: { fontSize: 10, fontWeight: '600', color: colors.amber600 },
  cardSub: { fontSize: 11, color: colors.gray400 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 14, color: colors.gray400, textAlign: 'center' },
  newBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
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

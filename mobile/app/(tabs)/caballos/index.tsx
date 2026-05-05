import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHorses } from '../../../hooks/use-horses';
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

export default function CaballosScreen() {
  const { data: horses, isLoading, refetch, isRefetching } = useHorses();
  const [search, setSearch] = useState('');
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
        <Text style={styles.title}>Caballos</Text>
        {horses && horses.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{horses.length}</Text>
          </View>
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
});

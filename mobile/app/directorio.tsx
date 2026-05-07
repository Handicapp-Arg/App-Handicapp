import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { haptic } from '../lib/haptics';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';

interface DirectorioItem {
  id: string;
  name: string;
  horse_count: number;
}

function useDirectorio(search: string) {
  return useQuery<DirectorioItem[]>({
    queryKey: ['directorio', search],
    queryFn: async () => {
      const url = search ? `/auth/directorio?search=${encodeURIComponent(search)}` : '/auth/directorio';
      return (await api.get(url)).data;
    },
    staleTime: 60_000,
  });
}

export default function DirectorioScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data, isLoading, refetch, isRefetching } = useDirectorio(debouncedSearch);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((global as any).__dirTimer);
    (global as any).__dirTimer = setTimeout(() => setDebouncedSearch(v), 400);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Directorio" showBack />

      {/* Buscador */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.gray400} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar establecimiento..."
          placeholderTextColor={colors.gray400}
          clearButtonMode="while-editing"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setDebouncedSearch(''); haptic.selection(); }}>
            <Ionicons name="close-circle" size={16} color={colors.gray300} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <View style={s.spinner} />
        </View>
      ) : !data?.length ? (
        <EmptyState
          icon="business-outline"
          title={search ? 'Sin resultados' : 'Sin establecimientos'}
          message={
            search
              ? `No encontramos establecimientos para "${search}".`
              : 'No hay establecimientos registrados en HandicApp.'
          }
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => d.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={s.card}>
              {/* Avatar inicial */}
              <View style={s.avatar}>
                <Text style={s.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.cardSub}>
                  {item.horse_count === 0
                    ? 'Sin caballos alojados'
                    : `${item.horse_count} caballo${item.horse_count !== 1 ? 's' : ''} en pensión`}
                </Text>
              </View>
              {/* Badge conteo */}
              <View style={s.badge}>
                <Text style={s.badgeNum}>{item.horse_count}</Text>
                <Ionicons name="paw-outline" size={10} color={colors.primary} />
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: space[2] }} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f3f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  spinner: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2.5, borderColor: colors.gray200, borderTopColor: colors.primary,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    marginHorizontal: space[4], marginVertical: space[3],
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.gray200,
    paddingHorizontal: space[3], paddingVertical: 2,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: text.sm, color: colors.gray900 },
  list: { paddingHorizontal: space[4], paddingBottom: space[8] },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: '#e8edf5',
    padding: space[4],
    shadowColor: '#0f1f3d', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: text.lg, fontWeight: weight.bold, color: colors.white },
  cardName: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  cardSub: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.gray100, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 5,
  },
  badgeNum: { fontSize: text.xs, fontWeight: weight.bold, color: colors.primary },
});

import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Spinner } from '../components/Spinner';
import { colors } from '../lib/colors';
import { space, text, radius, weight } from '../styles/tokens';
import { layout, typography } from '../styles/common';

interface DirectorioItem { id: string; name: string; horse_count: number; }

function useDirectorio(search: string) {
  return useQuery<DirectorioItem[]>({
    queryKey: ['directorio', search],
    queryFn: async () => {
      const url = search ? `/auth/directorio?search=${encodeURIComponent(search)}` : '/auth/directorio';
      return (await api.get(url)).data;
    },
  });
}

export default function DirectorioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const { data, isLoading, refetch, isRefetching } = useDirectorio(query);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((global as any).__dirTimer);
    (global as any).__dirTimer = setTimeout(() => setQuery(v), 400);
  };

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={typography.pageTitle}>Directorio</Text>
      </View>

      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={handleSearch}
          placeholder="Buscar establecimiento..."
          placeholderTextColor={colors.gray400}
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? <Spinner /> : !data?.length ? (
        <View style={layout.center}>
          <Text style={typography.caption}>{search ? 'Sin resultados' : 'No hay establecimientos registrados'}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.count}>{item.horse_count} {item.horse_count === 1 ? 'caballo en pensión' : 'caballos en pensión'}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✓ HandicApp</Text>
              </View>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingTop: space[2], paddingBottom: space[2] },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  backText: { fontSize: 24, color: colors.primary },
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space[4], marginBottom: space[3], backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray200, paddingHorizontal: space[3], gap: space[2] },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: space[2] + 2, fontSize: text.sm, color: colors.gray900 },
  list: { padding: space[4], gap: space[3], paddingBottom: space[8] },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.gray100, padding: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: text.lg, fontWeight: weight.bold, color: colors.white },
  info: { flex: 1 },
  name: { fontSize: text.sm, fontWeight: weight.bold, color: colors.gray900 },
  count: { fontSize: text.xs, color: colors.gray400, marginTop: 2 },
  badge: { backgroundColor: colors.emerald50, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: weight.semibold, color: colors.emerald700 },
});

import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Search, Globe, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Routes, nav } from '../lib/routes';
import { colors } from '../lib/colors';
import { useTheme, type ThemeColors } from '../lib/theme';
import { space, text, radius, weight, shadow, touch } from '../styles/tokens';
import { haptic } from '../lib/haptics';
import { useSearchLiveStudbook, type HorseRecord } from '../hooks/use-horse-records';
import { ListRowSkeleton } from '../components/Skeleton';
import { ScreenHeader } from '../components/ScreenHeader';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import api from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchResult { items: HorseRecord[]; total: number }

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useSearch(name: string) {
  return useQuery<SearchResult>({
    queryKey: ['horse-records', 'search', name],
    queryFn: () => api.get('/horse-records/search', { params: { name: name || undefined, limit: 20 } }).then(r => r.data),
    staleTime: 30_000,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEX_LABEL: Record<string, string> = { macho: 'Macho', hembra: 'Hembra', castrado: 'Castrado' };

function statusStyle(st: string, c: ThemeColors): { color: string; bg: string } {
  switch (st) {
    case 'verified':      return { color: c.success, bg: c.successSoft };
    case 'pending_claim': return { color: c.warning, bg: c.warningSoft };
    case 'disputed':      return { color: c.danger, bg: c.dangerSoft };
    default:              return { color: c.textFaint, bg: c.surfaceAlt };
  }
}
const STATUS_LABEL: Record<string, string> = {
  verified: 'Verificado',
  pending_claim: 'Solicitud pendiente',
  disputed: 'En disputa',
  unverified: 'Sin propietario',
};

// ─── Search result card ───────────────────────────────────────────────────────

function RecordCard({ record, onPress, cs, c }: { record: HorseRecord; onPress: () => void; cs: CardStyles; c: ThemeColors }) {
  const st = record.ownership_status ?? 'unverified';
  const ss = statusStyle(st, c);
  return (
    <TouchableOpacity style={cs.row} onPress={onPress} activeOpacity={0.6}>
      <View style={{ flex: 1 }}>
        <View style={cs.cardHeader}>
          <Text style={cs.cardName} numberOfLines={1}>{record.name}</Text>
          <View style={[cs.badge, { backgroundColor: ss.bg }]}>
            <View style={[cs.badgeDot, { backgroundColor: ss.color }]} />
            <Text style={[cs.badgeText, { color: ss.color }]}>{STATUS_LABEL[st]}</Text>
          </View>
        </View>
        <View style={cs.cardMeta}>
          {record.birth_year != null && <Text style={cs.metaItem}>{record.birth_year}</Text>}
          {record.sex && <Text style={cs.metaItem}>{SEX_LABEL[record.sex]}</Text>}
          {record.country_code && <Text style={cs.metaItem}>{record.country_code}</Text>}
          {record.color && <Text style={cs.metaItem} numberOfLines={1}>{record.color}</Text>}
        </View>
        {(record.sire_name || record.dam_name) && (
          <Text style={cs.cardPedigree} numberOfLines={1}>
            {record.sire_name ? `♂ ${record.sire_name}` : ''}
            {record.sire_name && record.dam_name ? '   ' : ''}
            {record.dam_name ? `♀ ${record.dam_name}` : ''}
          </Text>
        )}
      </View>
      <ChevronRight size={16} color={c.textFaint} strokeWidth={2} style={{ marginLeft: space[2] }} />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function PadronScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const cardS = useMemo(() => makeCardStyles(c), [c]);

  const { data, isLoading, isError, isFetching, refetch, isRefetching } = useSearch(query);

  // Búsqueda en vivo en el Stud Book Argentino (complemento explícito)
  const liveSearch = useSearchLiveStudbook();

  const handleSelect = useCallback((id: string) => {
    haptic.light();
    nav.push(router, `/padron/${id}`);
  }, [router]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const term = query.trim();
  const liveActive = !!term && liveSearch.variables === term;
  const liveItems = liveActive && liveSearch.data ? liveSearch.data.items : [];
  const liveSearched = liveActive && liveSearch.isSuccess;
  // Ofrecemos la búsqueda oficial cuando lo local trae 0 o muy pocos resultados
  const offerLiveSearch = !!term && !isLoading && total <= 2 && !liveSearched;

  const runLiveSearch = useCallback(() => {
    if (!term) return;
    haptic.light();
    liveSearch.mutate(term);
  }, [term, liveSearch]);

  const liveFooter = (!term || (!offerLiveSearch && !liveSearch.isPending && !liveSearched)) ? null : (
    <View style={s.liveWrap}>
      {(offerLiveSearch || liveSearch.isPending) && (
        <TouchableOpacity
          style={[s.liveBtn, liveSearch.isPending && { opacity: 0.7 }]}
          onPress={runLiveSearch}
          disabled={liveSearch.isPending}
          activeOpacity={0.85}
        >
          {liveSearch.isPending ? (
            <>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={s.liveBtnText}>Buscando en el registro oficial…</Text>
            </>
          ) : (
            <>
              <Globe size={18} color={colors.white} strokeWidth={2} />
              <Text style={s.liveBtnText}>Buscar en el Stud Book Argentino</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {liveSearch.isPending && (
        <Text style={s.liveHint}>Consultando el registro oficial, puede tardar unos segundos…</Text>
      )}

      {liveSearch.isError && (
        <Text style={s.liveError}>No pudimos consultar el Stud Book Argentino. Reintentá en un momento.</Text>
      )}

      {liveSearched && (
        liveItems.length > 0 ? (
          <View style={{ marginTop: space[2] }}>
            <Text style={s.liveSectionTitle}>{liveItems.length} en el Stud Book Argentino</Text>
            {liveItems.map((record, index) => (
              <Animated.View key={record.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                {index > 0 && <View style={cardS.divider} />}
                <RecordCard record={record} onPress={() => handleSelect(record.id)} cs={cardS} c={c} />
              </Animated.View>
            ))}
          </View>
        ) : (
          <Text style={s.liveEmpty}>No se encontró en el Stud Book Argentino.</Text>
        )
      )}
    </View>
  );

  return (
    <View style={s.root}>
      <ScreenHeader
        showBack
        backTo={Routes.mas}
        title="Padrón"
        subtitle="Registro oficial de caballos"
        right={isFetching ? <ActivityIndicator size="small" color={c.brand} /> : undefined}
      />

      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Search size={18} color={c.textFaint} strokeWidth={2} style={{ marginRight: space[2] }} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor={c.textFaint}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        {total > 0 && (
          <Text style={s.totalText}>
            {query ? `${total} resultado${total !== 1 ? 's' : ''}` : `${total} caballos en total`}
          </Text>
        )}
      </View>

      {isLoading && items.length === 0 ? (
        <View style={{ padding: space[4], gap: space[2] }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : isError && items.length === 0 ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
              <RecordCard record={item} onPress={() => handleSelect(item.id)} cs={cardS} c={c} />
            </Animated.View>
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={cardS.divider} />}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />
          }
          ListFooterComponent={liveFooter}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="Sin resultados"
              message={query ? 'No está en el padrón local' : undefined}
            />
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  searchWrap: {
    paddingHorizontal: space[4],
    paddingBottom: space[3],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb',
    borderRadius: radius.lg,
    paddingHorizontal: space[3],
    height: touch.field,
  },
  searchInput: { flex: 1, fontSize: text.sm, color: c.text },
  totalText: { fontSize: text.xs, color: c.textFaint, marginTop: space[2], paddingLeft: space[1] },
  list: { padding: space[4], paddingBottom: 80 },
  liveWrap: { marginTop: space[2], marginBottom: space[4] },
  liveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    backgroundColor: c.brand,
    borderRadius: radius.lg,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    ...shadow.sm,
  },
  liveBtnText: { fontSize: text.sm, fontWeight: weight.semibold, color: colors.white },
  liveHint: { fontSize: text.xs, color: c.textFaint, textAlign: 'center', marginTop: space[2] },
  liveError: { fontSize: text.xs, color: c.danger, textAlign: 'center', marginTop: space[2] },
  liveSectionTitle: {
    fontSize: text.xs,
    fontWeight: weight.semibold,
    color: c.textMuted,
    marginBottom: space[2],
    paddingLeft: space[1],
  },
  liveEmpty: { fontSize: text.sm, color: c.textFaint, textAlign: 'center', marginTop: space[3] },
});

type CardStyles = ReturnType<typeof makeCardStyles>;

const makeCardStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
  },
  divider: { height: 1, backgroundColor: c.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: space[2] },
  cardName: { flex: 1, fontSize: text.base, fontWeight: weight.bold, color: c.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    marginLeft: space[2],
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  badgeText: { fontSize: 10, fontWeight: weight.semibold },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: space[1] },
  metaItem: {
    fontSize: text.xs,
    color: c.textMuted,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: space[1],
    marginBottom: space[1],
  },
  cardPedigree: { fontSize: text.xs, color: c.textFaint, fontStyle: 'italic' },
});

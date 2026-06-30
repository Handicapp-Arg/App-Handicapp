import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Trophy, Tag, XCircle, MapPin, Star, CheckCircle2 } from 'lucide-react-native';
import { useAuctions } from '../../../hooks/use-auctions';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { HorseCardSkeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { haptic } from '../../../lib/haptics';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { nav, Routes } from '../../../lib/routes';
import type { Auction } from '../../../../packages/shared/src/types';

function formatARS(n: number, cur: string) {
  return `${cur} ${new Intl.NumberFormat('es-AR').format(n)}`;
}

function AuctionCard({ item, onPress, c, s }: { item: Auction; onPress: () => void; c: ThemeColors; s: Styles }) {
  const isRemate = item.type === 'remate';
  const price = isRemate ? (item.top_bid ?? item.starting_bid) : item.asking_price;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.cardHeader}>
        <View style={s.cardLeft}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.cardSub} numberOfLines={1}>{item.horse?.name}</Text>
          </View>
        </View>
        <View style={[s.typeBadge, isRemate ? s.typeBadgeRemate : s.typeBadgeDirecto]}>
          {isRemate
            ? <Trophy size={11} color="#b07d2b" strokeWidth={2} />
            : <Tag size={11} color="#9d6c35" strokeWidth={2} />}
          <Text style={[s.typeBadgeText, { color: isRemate ? '#b07d2b' : '#9d6c35' }]}>
            {isRemate ? 'Remate' : 'Directo'}
          </Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        <View>
          <Text style={s.priceLabel}>{isRemate ? (item.top_bid ? 'Puja actual' : 'Base') : 'Precio'}</Text>
          <Text style={s.price}>{price != null ? formatARS(Number(price), item.currency) : '–'}</Text>
        </View>
        <View style={s.metaRight}>
          {item.bid_count != null && item.bid_count > 0 && (
            <Text style={s.metaText}>{item.bid_count} puja{item.bid_count !== 1 ? 's' : ''}</Text>
          )}
          {item.location && (
            <View style={s.metaRow}>
              <MapPin size={11} color={c.textFaint} strokeWidth={2} />
              <Text style={s.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {item.watching && (
            <View style={s.metaRow}>
              <Star size={11} color="#d97706" fill="#d97706" strokeWidth={2} />
              <Text style={s.watchingBadge}>Siguiendo</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.docRow}>
        {item.has_health_cert && (
          <View style={s.docTag}>
            <CheckCircle2 size={11} color={c.isDark ? '#6ee7b7' : '#065f46'} strokeWidth={2.5} />
            <Text style={s.docTagText}>SENASA</Text>
          </View>
        )}
        {item.has_ownership_docs && (
          <View style={s.docTag}>
            <CheckCircle2 size={11} color={c.isDark ? '#6ee7b7' : '#065f46'} strokeWidth={2.5} />
            <Text style={s.docTagText}>Docs</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function RematesTab() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data, isLoading, refetch, isRefetching } = useAuctions({
    q: q || undefined,
    status: filterStatus || undefined,
  });

  const Header = (
    <>
      <ScreenHeader
        scrollable
        title="Remates"
        subtitle="Comprá y vendé equinos"
        showBack
        backTo={Routes.mas}
        right={
          <HeaderButton
            label="Publicar"
            icon={Plus}
            onPress={() => { haptic.medium(); nav.push(router, Routes.remateCrear); }}
          />
        }
      />

      {/* Búsqueda */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={16} color={c.textFaint} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar"
            placeholderTextColor={c.textFaint}
            value={q}
            onChangeText={setQ}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')} activeOpacity={0.7}>
              <XCircle size={16} color={c.textFaint} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros */}
      <View style={s.filterRow}>
        {[
          { v: 'active', l: 'Activos' },
          { v: '', l: 'Todos' },
          { v: 'sold', l: 'Vendidos' },
        ].map(({ v, l }) => (
          <TouchableOpacity
            key={l}
            style={[s.filterBtn, filterStatus === v && s.filterBtnActive]}
            onPress={() => { haptic.selection(); setFilterStatus(v); }}
            activeOpacity={0.8}
          >
            <Text style={[s.filterBtnText, filterStatus === v && s.filterBtnTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {isLoading ? (
        <View>
          {Header}
          <View style={{ padding: space[4], gap: space[3] }}>
            {[1, 2, 3, 4].map((i) => <HorseCardSkeleton key={i} />)}
          </View>
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={Header}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon="trophy-outline"
              title={filterStatus === 'active' ? 'No hay caballos en venta' : 'Sin resultados'}
              message={filterStatus === 'active'
                ? 'Sé el primero en publicar un caballo.'
                : 'Probá con otro filtro o búsqueda.'}
              actionLabel="Publicar mi caballo"
              onAction={() => { haptic.medium(); nav.push(router, Routes.remateCrear); }}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              style={s.cardWrap}
              entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}
            >
              <AuctionCard
                item={item}
                onPress={() => nav.push(router, Routes.remate(item.id))}
                c={c}
                s={s}
              />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  searchRow: { paddingHorizontal: space[4], paddingBottom: space[2] },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.borderStrong,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    ...shadow.sm,
  },
  searchInput: { flex: 1, fontSize: text.sm, color: c.text },

  filterRow: {
    flexDirection: 'row', gap: 2, padding: 3,
    marginHorizontal: space[4], marginBottom: space[3],
    backgroundColor: c.surfaceAlt, borderRadius: radius.full,
  },
  filterBtn: {
    flex: 1, paddingVertical: space[1] + 2, alignItems: 'center',
    borderRadius: radius.full,
  },
  filterBtnActive: {
    backgroundColor: c.surface,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
  },
  filterBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  filterBtnTextActive: { color: c.text },

  list: { paddingBottom: space[10], flexGrow: 1 },
  cardWrap: { paddingHorizontal: space[4] },

  card: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[4], marginBottom: space[3],
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space[3] },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  cardTitle: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  cardSub: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: space[2], paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  typeBadgeRemate: { backgroundColor: c.isDark ? 'rgba(217,169,78,0.16)' : '#fbf2de', borderColor: c.isDark ? 'rgba(217,169,78,0.3)' : '#f0ddb0' },
  typeBadgeDirecto: { backgroundColor: c.isDark ? 'rgba(157,108,53,0.18)' : '#faf3e9', borderColor: c.isDark ? 'rgba(157,108,53,0.32)' : '#f3e3cc' },
  typeBadgeText: { fontSize: 10, fontWeight: weight.semibold },

  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  priceLabel: { fontSize: 10, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  price: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.3 },
  metaRight: { alignItems: 'flex-end', gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: text.xs, color: c.textFaint },
  watchingBadge: { fontSize: 10, color: '#d97706', fontWeight: weight.semibold },

  docRow: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  docTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: space[2], paddingVertical: 2, backgroundColor: c.isDark ? 'rgba(16,185,129,0.16)' : '#d1fae5', borderRadius: radius.full },
  docTagText: { fontSize: 10, color: c.isDark ? '#6ee7b7' : '#065f46', fontWeight: weight.semibold },
});

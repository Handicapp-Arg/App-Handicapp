import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Trophy, Tag, Megaphone, XCircle } from 'lucide-react-native';
import { useAuctions } from '../../hooks/use-auctions';
import { HorseCardSkeleton } from '../../components/Skeleton';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { nav, Routes } from '../../lib/routes';
import type { Auction } from '../../../packages/shared/src/types';

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  draft: '#6b7280',
  paused: '#f59e0b',
  closed: '#3b82f6',
  sold: '#9d6c35',
  cancelled: '#ef4444',
};

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
          <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? c.textFaint }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.cardSub} numberOfLines={1}>{item.horse?.name}</Text>
          </View>
        </View>
        <View style={[s.typeBadge, isRemate ? s.typeBadgeRemate : s.typeBadgeDirecto]}>
          {isRemate
            ? <Trophy size={11} color="#9d6c35" strokeWidth={2} />
            : <Tag size={11} color="#0369a1" strokeWidth={2} />}
          <Text style={[s.typeBadgeText, { color: isRemate ? '#9d6c35' : '#0369a1' }]}>
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
          {item.location && <Text style={s.metaText} numberOfLines={1}>📍 {item.location}</Text>}
          {item.watching && <Text style={s.watchingBadge}>★ Siguiendo</Text>}
        </View>
      </View>

      <View style={s.docRow}>
        {item.has_health_cert && (
          <View style={s.docTag}><Text style={s.docTagText}>✓ SENASA</Text></View>
        )}
        {item.has_ownership_docs && (
          <View style={s.docTag}><Text style={s.docTagText}>✓ Docs</Text></View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function RematesTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data, isLoading, refetch, isRefetching } = useAuctions({
    q: q || undefined,
    status: filterStatus || undefined,
  });

  const Header = (
    <>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Remates</Text>
          <Text style={s.subtitle}>Comprá y vendé equinos</Text>
        </View>
        <TouchableOpacity
          style={s.publishBtn}
          onPress={() => { haptic.medium(); nav.push(router, Routes.remateCrear); }}
          activeOpacity={0.85}
        >
          <Plus size={18} color={colors.white} strokeWidth={2} />
          <Text style={s.publishBtnText}>Publicar</Text>
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Search size={16} color={c.textFaint} strokeWidth={2} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por caballo, raza, lugar..."
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
          { v: 'active', l: '🟢 Activos' },
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
            <View style={s.emptyBox}>
              <Trophy size={56} color={c.textFaint} strokeWidth={2} />
              <Text style={s.emptyTitle}>
                {filterStatus === 'active' ? 'No hay caballos en venta' : 'Sin resultados'}
              </Text>
              <Text style={s.emptySub}>
                {filterStatus === 'active'
                  ? 'Sé el primero en publicar un caballo.'
                  : 'Probá con otro filtro o búsqueda.'}
              </Text>
              <TouchableOpacity
                style={s.emptyAction}
                onPress={() => { haptic.medium(); nav.push(router, Routes.remateCrear); }}
                activeOpacity={0.85}
              >
                <Megaphone size={18} color={colors.white} strokeWidth={2} />
                <Text style={s.emptyActionText}>Publicar mi caballo</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: space[5], paddingBottom: space[3],
  },
  title: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5 },
  subtitle: { fontSize: text.sm, color: c.textFaint, marginTop: 2 },
  publishBtn: {
    flexDirection: 'row', alignItems: 'center', gap: space[1] + 2,
    backgroundColor: c.brand, borderRadius: radius.lg,
    paddingHorizontal: space[3] + 2, paddingVertical: space[2] + 2,
    marginTop: 4,
  },
  publishBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },

  searchRow: { paddingHorizontal: space[4], paddingBottom: space[2] },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.borderStrong,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    ...shadow.sm,
  },
  searchInput: { flex: 1, fontSize: text.sm, color: c.text },

  filterRow: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingBottom: space[3] },
  filterBtn: {
    paddingHorizontal: space[3], paddingVertical: space[1] + 2,
    borderRadius: radius.full, borderWidth: 1, borderColor: c.borderStrong,
    backgroundColor: c.surface,
  },
  filterBtnActive: { backgroundColor: c.brand, borderColor: c.brand },
  filterBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  filterBtnTextActive: { color: colors.white },

  list: { paddingBottom: space[10] },
  cardWrap: { paddingHorizontal: space[4] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  emptyBox: { alignItems: 'center', paddingTop: 48, paddingHorizontal: space[6], gap: space[3] },
  emptyTitle: { fontSize: text.lg, fontWeight: weight.bold, color: c.text },
  emptySub: { fontSize: text.sm, color: c.textFaint, textAlign: 'center', lineHeight: 20 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: c.brand, borderRadius: radius.xl,
    paddingHorizontal: space[5], paddingVertical: space[3] + 2,
    marginTop: space[2],
  },
  emptyActionText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },

  card: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[4], marginBottom: space[3],
    ...shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space[3] },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2, flexShrink: 0 },
  cardTitle: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  cardSub: { fontSize: text.xs, color: c.textFaint, marginTop: 1 },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: space[2], paddingVertical: 3,
    borderRadius: radius.full, borderWidth: 1,
  },
  typeBadgeRemate: { backgroundColor: '#faf3e9', borderColor: '#f3e3cc' },
  typeBadgeDirecto: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
  typeBadgeText: { fontSize: 10, fontWeight: weight.semibold },

  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  priceLabel: { fontSize: 10, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  price: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.brand, letterSpacing: -0.3 },
  metaRight: { alignItems: 'flex-end', gap: 2 },
  metaText: { fontSize: text.xs, color: c.textFaint },
  watchingBadge: { fontSize: 10, color: '#d97706', fontWeight: weight.semibold },

  docRow: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  docTag: { paddingHorizontal: space[2], paddingVertical: 2, backgroundColor: '#d1fae5', borderRadius: radius.full },
  docTagText: { fontSize: 10, color: '#065f46', fontWeight: weight.semibold },
});

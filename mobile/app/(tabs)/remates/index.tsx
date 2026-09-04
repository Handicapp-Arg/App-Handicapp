import { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Pressable, TextInput,
  StyleSheet, RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Gavel, Tag, XCircle, MapPin, Star, CheckCircle2, Clock } from 'lucide-react-native';
import { useAuctions } from '../../../hooks/use-auctions';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { HorseCardSkeleton } from '../../../components/Skeleton';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { haptic } from '../../../lib/haptics';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, touch } from '../../../styles/tokens';
import { makeCard } from '../../../styles/common';
import { nav, Routes } from '../../../lib/routes';
import type { Auction } from '../../../../packages/shared/src/types';
import { formatMoney, type Currency } from '../../../lib/currency';
import { colors } from '../../../lib/colors';

function formatARS(n: number, cur: string) {
  return formatMoney(n, cur as Currency);
}

// Tiempo restante compacto para la tarjeta ("Cierra en 3h", "Cierra en 2d").
// Devuelve null si no aplica (sin fecha, o ya cerrado) y marca `urgent` si
// faltan menos de 24hs — esa es la señal que dispara el color de alerta.
function timeLeft(end: string | null | undefined): { label: string; urgent: boolean } | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return null;
  const hours = ms / 3_600_000;
  if (hours < 24) {
    const h = Math.max(1, Math.floor(hours));
    return { label: `Cierra en ${h}h`, urgent: true };
  }
  const days = Math.floor(hours / 24);
  return { label: `Cierra en ${days}d`, urgent: false };
}

function AuctionCard({ item, onPress, c, s }: { item: Auction; onPress: () => void; c: ThemeColors; s: Styles }) {
  const isRemate = item.type === 'remate';
  const price = isRemate ? (item.top_bid ?? item.starting_bid) : item.asking_price;
  const closing = isRemate && item.status === 'active' ? timeLeft(item.auction_end) : null;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${isRemate ? 'remate' : 'venta directa'}`}
    >
      <View style={s.cardHeader}>
        <View style={s.cardLeft}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.cardSub} numberOfLines={1}>{item.horse?.name}</Text>
          </View>
        </View>
        <View style={[s.typeBadge, isRemate ? s.typeBadgeRemate : s.typeBadgeDirecto]}>
          {isRemate
            ? <Gavel size={11} color={c.info} strokeWidth={2} />
            : <Tag size={11} color={c.textMuted} strokeWidth={2} />}
          <Text style={[s.typeBadgeText, { color: isRemate ? c.info : c.textMuted }]}>
            {isRemate ? 'Remate' : 'Venta directa'}
          </Text>
        </View>
      </View>

      <View style={s.cardFooter}>
        <View>
          <Text style={s.priceLabel}>{isRemate ? (item.top_bid ? 'Puja actual' : 'Base') : 'Precio'}</Text>
          <Text style={s.price} numberOfLines={1}>{price != null ? formatARS(Number(price), item.currency) : '–'}</Text>
        </View>
        <View style={s.metaRight}>
          {closing && (
            <View style={s.metaRow}>
              <Clock size={11} color={closing.urgent ? c.warning : c.textFaint} strokeWidth={2} />
              <Text style={[s.metaText, closing.urgent && s.metaTextUrgent]}>{closing.label}</Text>
            </View>
          )}
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
              <Star size={11} color={c.warning} fill={c.warning} strokeWidth={2} />
              <Text style={s.watchingBadge}>Siguiendo</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.docRow}>
        {item.has_health_cert && (
          <View style={s.docTag}>
            <CheckCircle2 size={11} color={c.success} strokeWidth={2.5} />
            <Text style={s.docTagText}>SENASA</Text>
          </View>
        )}
        {item.has_ownership_docs && (
          <View style={s.docTag}>
            <CheckCircle2 size={11} color={c.success} strokeWidth={2.5} />
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

  const { data, isLoading, isError, refetch, isRefetching } = useAuctions({
    q: q || undefined,
    status: filterStatus || undefined,
  });
  const items = data?.data ?? [];

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
            <TouchableOpacity
              onPress={() => setQ('')}
              activeOpacity={0.7}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
            >
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
      {isError && items.length === 0 ? (
        <View>
          {Header}
          <ErrorState onRetry={refetch} />
        </View>
      ) : isLoading ? (
        <View>
          {Header}
          <View style={{ padding: space[4], gap: space[3] }}>
            {[1, 2, 3, 4].map((i) => <HorseCardSkeleton key={i} />)}
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={Header}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} />
          }
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

      <Pressable
        style={s.fab}
        onPress={() => { haptic.medium(); nav.push(router, Routes.remateCrear); }}
        accessibilityRole="button"
        accessibilityLabel="Publicar caballo"
        hitSlop={8}
      >
        <Plus size={26} color={colors.white} strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => {
  const card = makeCard(c);
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },

  searchRow: { paddingHorizontal: space[4], paddingBottom: space[2] },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    backgroundColor: c.isDark ? c.surfaceAlt : '#f2f0eb', borderRadius: radius.xl,
    paddingHorizontal: space[3], height: touch.min,
  },
  searchInput: { flex: 1, fontSize: text.base, color: c.text },

  filterRow: {
    flexDirection: 'row', gap: 2, padding: 3,
    marginHorizontal: space[4], marginBottom: space[3],
    backgroundColor: c.surfaceAlt, borderRadius: radius.full,
  },
  filterBtn: {
    flex: 1, minHeight: touch.min, justifyContent: 'center', alignItems: 'center',
    borderRadius: radius.full,
  },
  filterBtnActive: {
    backgroundColor: c.surface,
    ...(c.isDark ? {} : { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 }),
  },
  filterBtnText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted },
  filterBtnTextActive: { color: c.text },

  list: { paddingBottom: 120, flexGrow: 1 },
  cardWrap: { paddingHorizontal: space[4] },

  card: {
    ...card.padded,
    marginBottom: space[3],
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: space[3] },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: space[2], flex: 1 },
  cardTitle: { fontSize: text.base, fontWeight: weight.bold, color: c.text, letterSpacing: -0.2 },
  cardSub: { fontSize: text.sm, color: c.textFaint, marginTop: 1 },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: space[2], paddingVertical: 3,
    borderRadius: radius.full,
  },
  typeBadgeRemate: { backgroundColor: c.infoSoft },
  typeBadgeDirecto: { backgroundColor: c.surfaceAlt },
  typeBadgeText: { fontSize: text.xs, fontWeight: weight.semibold },

  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  priceLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  price: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  metaRight: { alignItems: 'flex-end', gap: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: text.xs, color: c.textFaint },
  metaTextUrgent: { color: c.warning, fontWeight: weight.bold },
  watchingBadge: { fontSize: text.xs, color: c.warning, fontWeight: weight.semibold },

  docRow: { flexDirection: 'row', gap: space[2], marginTop: space[2] },
  docTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: space[2], paddingVertical: 2, backgroundColor: c.successSoft, borderRadius: radius.full },
  docTagText: { fontSize: text.xs, color: c.success, fontWeight: weight.semibold },
  fab: {
    position: 'absolute', right: 20, bottom: 110,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.brand, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 4,
  },
  });
};

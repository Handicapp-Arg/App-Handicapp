import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, Info, Star, MapPin } from 'lucide-react-native';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Avatar } from '../../../components/Avatar';
import { useAuction, useAuctionBids, usePlaceBid, useToggleWatch, usePublishAuction } from '../../../hooks/use-auctions';
import { useAuth } from '../../../lib/auth';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow } from '../../../styles/tokens';
import { formatMoney, type Currency } from '../../../lib/currency';

function formatARS(n: number | null | undefined, cur: string) {
  if (n == null) return '–';
  return formatMoney(Number(n), cur as Currency);
}

function Countdown({ end, s }: { end: string; s: Styles }) {
  const [left, setLeft] = useState(Math.max(0, new Date(end).getTime() - Date.now()));

  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, new Date(end).getTime() - Date.now())), 1000);
    return () => clearInterval(t);
  }, [end]);

  const d = Math.floor(left / 86_400_000);
  const h = Math.floor((left % 86_400_000) / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const sec = Math.floor((left % 60_000) / 1_000);

  if (left === 0) return <Text style={{ color: '#ef4444', fontWeight: weight.bold }}>Remate cerrado</Text>;

  return (
    <View style={{ flexDirection: 'row', gap: space[2] }}>
      {[{ v: d, l: 'd' }, { v: h, l: 'h' }, { v: m, l: 'm' }, { v: sec, l: 's' }].map(({ v, l }) => (
        <View key={l} style={{ alignItems: 'center' }}>
          <View style={s.countBox}>
            <Text style={s.countNum}>{String(v).padStart(2, '0')}</Text>
          </View>
          <Text style={s.countLabel}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

export default function AuctionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: auction, isLoading } = useAuction(id);
  const { data: bids } = useAuctionBids(id);
  const placeBid = usePlaceBid();
  const toggleWatch = useToggleWatch();
  const publish = usePublishAuction();

  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');

  if (isLoading || !auction) {
    return (
      <View style={[s.root, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={c.brand} />
      </View>
    );
  }

  const isSeller = auction.seller_id === user?.id;
  const isActive = auction.status === 'active';
  const isRemate = auction.type === 'remate';
  const topBid = bids?.find((b) => b.status === 'active');
  const minNextBid = topBid
    ? Number(topBid.amount) + Number(auction.bid_increment ?? 1)
    : Number(auction.starting_bid ?? 0);

  const handleBid = async () => {
    setBidError('');
    const amount = parseFloat(bidAmount);
    if (isNaN(amount)) { setBidError('Monto inválido'); return; }
    if (amount < minNextBid) { setBidError(`Mínimo: ${formatARS(minNextBid, auction.currency)}`); return; }
    try {
      await placeBid.mutateAsync({ auctionId: id, amount });
      setBidAmount('');
    } catch (err: unknown) {
      setBidError((err as Error)?.message ?? 'Error al pujar');
    }
  };

  return (
    <View style={s.root}>
      <ScreenHeader
        title="Remate"
        showBack
        right={
          !isSeller ? (
            <TouchableOpacity onPress={() => toggleWatch.mutate(id)} style={s.watchBtn}>
              <Star
                size={20}
                color={auction.watching ? '#d97706' : c.textFaint}
                fill={auction.watching ? '#d97706' : 'none'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          ) : auction.status === 'draft' ? (
            <TouchableOpacity onPress={() => publish.mutateAsync(id)} style={s.publishBtn}>
              <Text style={s.publishBtnText}>Publicar</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Título */}
        <Text style={s.auctionTitle}>{auction.title}</Text>
        <Text style={s.horseName}>{auction.horse?.name}</Text>
        {auction.location && (
          <View style={s.locationRow}>
            <MapPin size={12} color={c.textFaint} strokeWidth={2} />
            <Text style={s.location}>{auction.location}</Text>
          </View>
        )}

        {/* Precio */}
        <View style={s.priceCard}>
          <Text style={s.priceLabelSmall}>
            {isRemate ? (topBid ? 'Puja actual' : 'Puja inicial') : 'Precio pedido'}
          </Text>
          <Text style={s.priceMain}>
            {formatARS(
              isRemate ? Number(topBid?.amount ?? auction.starting_bid) : Number(auction.asking_price),
              auction.currency,
            )}
          </Text>
          {bids && bids.length > 0 && (
            <Text style={s.bidCount}>{bids.length} puja{bids.length !== 1 ? 's' : ''}</Text>
          )}

          {/* Countdown */}
          {isRemate && isActive && auction.auction_end && (
            <View style={{ marginTop: space[4] }}>
              <Text style={s.priceLabelSmall}>Tiempo restante</Text>
              <Countdown end={auction.auction_end} s={s} />
            </View>
          )}
        </View>

        {/* Acción pujar */}
        {!isSeller && isActive && isRemate && (
          <View style={s.bidBox}>
            <Text style={s.sectionTitle}>Hacer una puja</Text>
            <Text style={s.bidHint}>Mínimo: {formatARS(minNextBid, auction.currency)}</Text>
            <View style={s.bidInputRow}>
              <TextInput
                style={s.bidInput}
                placeholder={String(minNextBid)}
                placeholderTextColor={c.textFaint}
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
              />
              <TouchableOpacity style={s.bidBtn} onPress={handleBid} disabled={placeBid.isPending}>
                {placeBid.isPending
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={s.bidBtnText}>Pujar</Text>}
              </TouchableOpacity>
            </View>
            {bidError ? <Text style={s.bidError}>{bidError}</Text> : null}
          </View>
        )}

        {/* Descripción */}
        {auction.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Descripción</Text>
            <Text style={s.sectionBody}>{auction.description}</Text>
          </View>
        )}

        {/* Documentación */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Documentación</Text>
          <View style={{ gap: space[2] }}>
            {[
              { ok: auction.has_health_cert, label: 'Certificado SENASA vigente' },
              { ok: auction.has_ownership_docs, label: 'Docs de propiedad (Studbook/SRA)' },
            ].map(({ ok, label }) => (
              <View key={label} style={[s.docRow, { backgroundColor: ok ? '#d1fae5' : c.surfaceAlt, borderColor: ok ? '#6ee7b7' : c.borderStrong }]}>
                {ok
                  ? <CheckCircle2 size={16} color="#059669" strokeWidth={2} />
                  : <XCircle size={16} color={c.textFaint} strokeWidth={2} />}
                <Text style={[s.docLabel, { color: ok ? '#065f46' : c.textFaint }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Condiciones */}
        {(auction.payment_terms || auction.delivery_terms) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Condiciones</Text>
            {auction.payment_terms && (
              <>
                <Text style={s.condLabel}>Pago</Text>
                <Text style={s.sectionBody}>{auction.payment_terms}</Text>
              </>
            )}
            {auction.delivery_terms && (
              <>
                <Text style={[s.condLabel, { marginTop: space[2] }]}>Entrega</Text>
                <Text style={s.sectionBody}>{auction.delivery_terms}</Text>
              </>
            )}
          </View>
        )}

        {/* Historial pujas */}
        {isRemate && bids && bids.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Historial de pujas ({bids.length})</Text>
            {bids.slice(0, 10).map((b, index) => (
              <Animated.View key={b.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                <View style={[s.bidRow, b.status === 'active' && s.bidRowActive]}>
                  <Avatar name={b.bidder?.name} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.bidderName}>{b.bidder?.name ?? 'Usuario'}</Text>
                    <Text style={s.bidDate}>{new Date(b.created_at).toLocaleString('es-AR')}</Text>
                  </View>
                  <Text style={s.bidAmount}>{formatARS(b.amount, b.currency)}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Aviso legal */}
        <View style={s.legalBox}>
          <Info size={16} color="#92400e" strokeWidth={2} />
          <Text style={s.legalText}>
            Las pujas son vinculantes. HandicApp retiene un 3% de comisión sobre el precio final. La transferencia legal requiere documentación notarial.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  watchBtn: { padding: space[2] },
  publishBtn: { backgroundColor: c.brand, paddingHorizontal: space[4], paddingVertical: space[2], borderRadius: radius.lg },
  publishBtnText: { color: colors.white, fontSize: text.sm, fontWeight: weight.bold },

  scroll: { paddingHorizontal: space[4], paddingBottom: space[16] },

  auctionTitle: { fontSize: text.xl, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.4, marginBottom: 4 },
  horseName: { fontSize: text.sm, color: c.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: space[4] },
  location: { fontSize: text.xs, color: c.textFaint },

  priceCard: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[5], marginBottom: space[4], ...shadow.sm,
  },
  priceLabelSmall: { fontSize: 10, fontWeight: weight.bold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  priceMain: { fontSize: 28, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5 },
  bidCount: { fontSize: text.xs, color: c.textFaint, marginTop: 4 },

  countBox: { backgroundColor: c.brand, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 6, minWidth: 36, alignItems: 'center' },
  countNum: { color: colors.white, fontSize: text.lg, fontWeight: weight.extrabold },
  countLabel: { fontSize: 10, color: c.textFaint, marginTop: 2, textTransform: 'uppercase' },

  bidBox: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.borderStrong,
    padding: space[4], marginBottom: space[4], ...shadow.sm,
  },
  bidHint: { fontSize: text.xs, color: c.textFaint, marginBottom: space[2] },
  bidInputRow: { flexDirection: 'row', gap: space[2] },
  bidInput: {
    flex: 1, borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.lg,
    paddingHorizontal: space[3], paddingVertical: space[2] + 2,
    fontSize: text.sm, color: c.text,
  },
  bidBtn: {
    backgroundColor: c.brand, borderRadius: radius.lg,
    paddingHorizontal: space[4], justifyContent: 'center', alignItems: 'center',
  },
  bidBtnText: { color: colors.white, fontWeight: weight.bold, fontSize: text.sm },
  bidError: { color: '#ef4444', fontSize: text.xs, marginTop: space[1] },

  section: { marginBottom: space[4] },
  sectionTitle: { fontSize: text.sm, fontWeight: weight.bold, color: c.text, marginBottom: space[2] },
  sectionBody: { fontSize: text.sm, color: c.textMuted, lineHeight: 20 },
  condLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },

  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderWidth: 1, borderRadius: radius.lg, padding: space[3],
  },
  docLabel: { fontSize: text.sm, fontWeight: weight.medium },

  bidRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    padding: space[3], borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surfaceAlt, marginBottom: space[2],
  },
  bidRowActive: { backgroundColor: c.isDark ? 'rgba(16,185,129,0.14)' : '#ecfdf5', borderColor: c.isDark ? 'rgba(16,185,129,0.4)' : '#6ee7b7' },
  bidderName: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  bidDate: { fontSize: 10, color: c.textFaint },
  bidAmount: { fontSize: text.sm, fontWeight: weight.extrabold, color: c.text },

  legalBox: {
    flexDirection: 'row', gap: space[2], alignItems: 'flex-start',
    backgroundColor: c.isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb', borderWidth: 1, borderColor: c.isDark ? 'rgba(245,158,11,0.3)' : '#fde68a',
    borderRadius: radius.xl, padding: space[4], marginTop: space[2],
  },
  legalText: { flex: 1, fontSize: text.xs, color: c.isDark ? '#fcd34d' : '#92400e', lineHeight: 16 },
});

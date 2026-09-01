import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, XCircle, Info, Star, MapPin } from 'lucide-react-native';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { Avatar } from '../../../components/Avatar';
import { Skeleton } from '../../../components/Skeleton';
import { ErrorState } from '../../../components/ErrorState';
import { useAuction, useAuctionBids, usePlaceBid, useToggleWatch, usePublishAuction } from '../../../hooks/use-auctions';
import { useAuth } from '../../../lib/auth';
import { haptic } from '../../../lib/haptics';
import { colors } from '../../../lib/colors';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight, shadow, touch } from '../../../styles/tokens';
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

  if (left === 0) return <Text style={s.remateClosed}>Remate cerrado</Text>;

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
  const { user } = useAuth();

  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: auction, isLoading, isError, refetch } = useAuction(id);
  const { data: bids } = useAuctionBids(id);
  const placeBid = usePlaceBid();
  const toggleWatch = useToggleWatch();
  const publish = usePublishAuction();

  const [bidAmount, setBidAmount] = useState('');
  const [bidError, setBidError] = useState('');

  if (isError) {
    return (
      <View style={s.root}>
        <ScreenHeader title="Remate" showBack />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (isLoading || !auction) {
    return (
      <View style={s.root}>
        <ScreenHeader title="Remate" showBack />
        <View style={s.scroll}>
          <Skeleton height={28} width="70%" style={{ marginBottom: space[2] }} />
          <Skeleton height={16} width="40%" style={{ marginBottom: space[5] }} />
          <Skeleton height={140} borderRadius={radius.xl} style={{ marginBottom: space[4] }} />
          <Skeleton height={90} borderRadius={radius.xl} />
        </View>
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
      haptic.success();
    } catch (err: unknown) {
      setBidError((err as Error)?.message ?? 'Error al pujar');
      haptic.error();
    }
  };

  return (
    <View style={s.root}>
      <ScreenHeader
        title="Remate"
        showBack
        right={
          !isSeller ? (
            <TouchableOpacity
              onPress={() => { haptic.selection(); toggleWatch.mutate(id); }}
              style={s.watchBtn}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={auction.watching ? 'Dejar de seguir' : 'Seguir remate'}
            >
              <Star
                size={20}
                color={auction.watching ? c.warning : c.textFaint}
                fill={auction.watching ? c.warning : 'none'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          ) : auction.status === 'draft' ? (
            <TouchableOpacity
              onPress={() => { haptic.medium(); publish.mutateAsync(id); }}
              style={s.publishBtn}
              accessibilityRole="button"
              accessibilityLabel="Publicar remate"
            >
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
              <TouchableOpacity
                style={s.bidBtn}
                onPress={handleBid}
                disabled={placeBid.isPending}
                accessibilityRole="button"
                accessibilityLabel="Confirmar puja"
              >
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
              <View key={label} style={[s.docRow, { backgroundColor: ok ? c.successSoft : c.surfaceAlt }]}>
                {ok
                  ? <CheckCircle2 size={16} color={c.success} strokeWidth={2} />
                  : <XCircle size={16} color={c.textFaint} strokeWidth={2} />}
                <Text style={[s.docLabel, { color: ok ? c.success : c.textFaint }]}>{label}</Text>
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
          <Info size={16} color={c.warning} strokeWidth={2} />
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
  publishBtn: { backgroundColor: c.brand, paddingHorizontal: space[4], borderRadius: radius.lg, minHeight: touch.min, justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: colors.white, fontSize: text.sm, fontWeight: weight.bold },

  scroll: { paddingHorizontal: space[4], paddingBottom: space[16] },

  auctionTitle: { fontSize: text.xl, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.4, marginBottom: 4 },
  horseName: { fontSize: text.base, color: c.textMuted },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: space[4] },
  location: { fontSize: text.xs, color: c.textFaint },

  priceCard: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    padding: space[5], marginBottom: space[4], ...(c.isDark ? {} : shadow.sm),
  },
  priceLabelSmall: { fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  priceMain: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  bidCount: { fontSize: text.xs, color: c.textFaint, marginTop: 4 },

  remateClosed: { color: c.danger, fontWeight: weight.bold },

  countBox: { backgroundColor: c.brand, borderRadius: radius.md, paddingHorizontal: 8, paddingVertical: 6, minWidth: 36, alignItems: 'center' },
  countNum: { color: colors.white, fontSize: text.lg, fontWeight: weight.extrabold },
  countLabel: { fontSize: text.xs, color: c.textFaint, marginTop: 2, textTransform: 'uppercase' },

  bidBox: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    padding: space[4], marginBottom: space[4], ...(c.isDark ? {} : shadow.sm),
  },
  bidHint: { fontSize: text.sm, color: c.textFaint, marginBottom: space[2] },
  bidInputRow: { flexDirection: 'row', gap: space[2] },
  bidInput: {
    flex: 1, height: touch.field, borderRadius: radius.lg,
    paddingHorizontal: space[4], backgroundColor: c.isDark ? c.surfaceAlt : '#f1f2f4',
    fontSize: text.md, color: c.text, fontVariant: ['tabular-nums'],
  },
  bidBtn: {
    height: touch.field, backgroundColor: c.brand, borderRadius: radius.lg,
    paddingHorizontal: space[5], justifyContent: 'center', alignItems: 'center',
  },
  bidBtnText: { color: colors.white, fontWeight: weight.bold, fontSize: text.md },
  bidError: { color: c.danger, fontSize: text.xs, marginTop: space[1] },

  section: { marginBottom: space[4] },
  sectionTitle: { fontSize: text.md, fontWeight: weight.bold, color: c.text, marginBottom: space[2], letterSpacing: -0.2 },
  sectionBody: { fontSize: text.base, color: c.textMuted, lineHeight: 22 },
  condLabel: { fontSize: text.xs, fontWeight: weight.semibold, color: c.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },

  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    borderRadius: radius.lg, padding: space[3],
  },
  docLabel: { fontSize: text.sm, fontWeight: weight.medium },

  bidRow: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    padding: space[3], borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt, marginBottom: space[2],
  },
  bidRowActive: { backgroundColor: c.successSoft },
  bidderName: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  bidDate: { fontSize: text.xs, color: c.textFaint },
  bidAmount: { fontSize: text.base, fontWeight: weight.extrabold, color: c.text, fontVariant: ['tabular-nums'] },

  legalBox: {
    flexDirection: 'row', gap: space[2], alignItems: 'flex-start',
    backgroundColor: c.warningSoft, borderWidth: 1, borderColor: c.warning,
    borderRadius: radius.xl, padding: space[4], marginTop: space[2],
  },
  legalText: { flex: 1, fontSize: text.xs, color: c.warning, lineHeight: 16 },
});

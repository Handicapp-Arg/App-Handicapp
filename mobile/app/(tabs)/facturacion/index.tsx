import { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useBills, STATUS_META, monthLabel } from '../../../hooks/use-billing';
import { formatMoney } from '../../../lib/currency';
import { useAuth } from '../../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { Routes } from '../../../lib/routes';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { haptic } from '../../../lib/haptics';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';
import { useCommonStyles } from '../../../styles/common';

// STATUS_META (hooks/use-billing.ts) trae hex fijos, no dark-safe. Remapeamos
// acá a los semánticos del theme, igual que en contratos.tsx.
const makeStatusColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  borrador:  { bg: c.surfaceAlt, text: c.textMuted },
  enviada:   { bg: c.infoSoft, text: c.info },
  aprobada:  { bg: c.successSoft, text: c.success },
  disputada: { bg: c.dangerSoft, text: c.danger },
});

export default function FacturacionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { layout } = useCommonStyles();
  const s = useMemo(() => makeStyles(c), [c]);
  const billStatusColors = useMemo(() => makeStatusColors(c), [c]);
  const { data: bills, isLoading, isError, refetch, isRefetching } = useBills();

  const isEst = user?.role === 'establecimiento';

  const headerRight = isEst
    ? <HeaderButton label="Nueva factura" icon={Plus} onPress={() => { haptic.light(); router.push(Routes.facturacionNueva as never); }} />
    : undefined;

  return (
    <View style={[layout.screen, { paddingTop: insets.top }]}>
      {isLoading ? (
        <View>
          <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />
          <View style={{ paddingHorizontal: space[4] }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={[s.billRow, i < 4 && s.billDivider]}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="55%" height={13} />
                  <Skeleton width="35%" height={11} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Skeleton width={84} height={20} />
                  <Skeleton width={70} height={18} borderRadius={radius.full} />
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : isError && !bills?.length ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />
          <ErrorState onRetry={refetch} />
        </ScrollView>
      ) : !bills?.length ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
        >
          <ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />
          <EmptyState
            icon="receipt-outline"
            title={isEst ? 'Sin facturas creadas' : 'Sin facturas recibidas'}
            message={isEst ? 'Creá facturas de pensión para enviar a los propietarios.' : 'Las facturas del establecimiento aparecerán aquí para que puedas aprobarlas.'}
            tint={c.brand}
            actionLabel={isEst ? 'Nueva factura' : undefined}
            onAction={isEst ? () => { haptic.light(); router.push(Routes.facturacionNueva as never); } : undefined}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={bills}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={<ScreenHeader scrollable showBack backTo={Routes.mas} title="Facturación" right={headerRight} />}
          renderItem={({ item: bill, index }) => {
            const meta = STATUS_META[bill.status];
            const sc = billStatusColors[bill.status] ?? billStatusColors.borrador;
            return (
              <Animated.View entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                {/* Extracto puro: concepto + período a la izquierda, monto + estado a la derecha. Push al detalle. */}
                <TouchableOpacity
                  style={[s.billRow, { marginHorizontal: space[4] }, index < bills.length - 1 && s.billDivider]}
                  onPress={() => { haptic.selection(); router.push(Routes.factura(bill.id) as never); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Factura de ${bill.horse?.name ?? 'caballo'}, ${monthLabel(bill.month, bill.year)}`}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={s.horseName} numberOfLines={1}>{bill.horse?.name ?? 'Factura'}</Text>
                    <Text style={s.period}>{monthLabel(bill.month, bill.year)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={s.total}>{formatMoney(bill.total, bill.currency)}</Text>
                    <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                      <View style={[s.statusDot, { backgroundColor: sc.text }]} />
                      <Text style={[s.statusText, { color: sc.text }]}>{meta.label}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: space[4] },
  billDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: text.xs, fontWeight: weight.semibold },
  horseName: { fontSize: text.sm, fontWeight: weight.bold, color: c.text },
  period: { fontSize: text.xs, color: c.textMuted },
  total: { fontSize: text.xl, fontWeight: weight.extrabold, color: c.text, fontVariant: ['tabular-nums'] },
});

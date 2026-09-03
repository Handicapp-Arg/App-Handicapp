import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileText, Check, X, ChevronRight, Plus } from 'lucide-react-native';
import { useContracts, type Contract } from '../../../hooks/use-contracts';
import { useAuth } from '../../../lib/auth';
import { ScreenHeader, HeaderButton } from '../../../components/ScreenHeader';
import { Routes } from '../../../lib/routes';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Skeleton } from '../../../components/Skeleton';
import { haptic } from '../../../lib/haptics';
import { fechaHumana } from '../../../lib/fechas';
import { useTheme, type ThemeColors } from '../../../lib/theme';
import { space, text, radius, weight } from '../../../styles/tokens';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', signed: 'Firmado', rejected: 'Rechazado',
};
// Estados reales del contrato -> semánticos del theme (dark-safe).
const makeStatusColors = (c: ThemeColors): Record<string, { bg: string; text: string }> => ({
  pending:  { bg: c.warningSoft, text: c.warning },
  signed:   { bg: c.successSoft, text: c.success },
  rejected: { bg: c.dangerSoft, text: c.danger },
});

function ContractRow({ contract, userId, onPress, isLast, c, cs }: {
  contract: Contract; userId: string;
  onPress: () => void;
  isLast?: boolean;
  c: ThemeColors;
  cs: CStyles;
}) {
  const statusColors = makeStatusColors(c);
  const sc = statusColors[contract.status] ?? statusColors.pending;
  const isOwner = contract.owner_id === userId;
  const ownerSigned = !!contract.signed_at;
  const estabSigned = !!contract.establishment_signed_at;
  const dateStr = fechaHumana(contract.created_at);

  // Aviso de firma parcial (una parte firmó, falta la otra).
  const partialMsg =
    contract.status === 'pending' && estabSigned && !ownerSigned
      ? 'Firmado por el establecimiento — falta la firma del propietario'
      : contract.status === 'pending' && ownerSigned && !estabSigned
        ? 'Firmado por el propietario — falta la firma del establecimiento'
        : null;

  return (
    <View style={[cs.rowCollapsed, !isLast && cs.rowDivider]}>
      <TouchableOpacity
        onPress={() => { haptic.selection(); onPress(); }}
        activeOpacity={0.7}
        style={cs.cardHeader}
        accessibilityRole="button"
        accessibilityLabel={`Ver contrato ${contract.title}`}
      >
        <View style={cs.docIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <FileText size={22} color={c.text} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={cs.title} numberOfLines={1}>{contract.title}</Text>
          <Text style={cs.meta} numberOfLines={1}>
            {isOwner ? `De ${contract.establishment?.name}` : `Para ${contract.owner?.name}`} · {dateStr}
          </Text>
          <View style={cs.tagRow}>
            <View style={[cs.statusBadge, { backgroundColor: sc.bg }]}>
              <View style={[cs.statusDot, { backgroundColor: sc.text }]} />
              <Text style={[cs.statusText, { color: sc.text }]}>{STATUS_LABEL[contract.status]}</Text>
            </View>
            {contract.horse && (
              <View style={cs.horseBadge}>
                <Text style={cs.horseText}>{contract.horse.name}</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronRight size={20} color={c.textFaint} strokeWidth={2} />
      </TouchableOpacity>

      {contract.status === 'signed' && (
        <View style={cs.signedBanner}>
          <Check size={13} color={c.success} strokeWidth={2.5} />
          <Text style={cs.signedText}>Firmado por ambas partes</Text>
        </View>
      )}
      {partialMsg && (
        <View style={cs.pendingBanner}>
          <Check size={13} color={c.warning} strokeWidth={2.5} />
          <Text style={cs.pendingText}>{partialMsg}</Text>
        </View>
      )}
      {contract.status === 'rejected' && contract.rejection_reason && (
        <View style={cs.rejectedBanner}>
          <X size={13} color={c.danger} strokeWidth={2.5} />
          <Text style={cs.rejectedText}>Motivo: {contract.rejection_reason}</Text>
        </View>
      )}
    </View>
  );
}

export default function ContratosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const cs = useMemo(() => makeCStyles(c), [c]);
  const { data: contracts, isLoading, isError, refetch, isRefetching } = useContracts();

  const isEstab = user?.role === 'establecimiento' || user?.role === 'admin';

  const pending = contracts?.filter((ct) => ct.status === 'pending') ?? [];
  const others = contracts?.filter((ct) => ct.status !== 'pending') ?? [];

  const header = (
    <ScreenHeader
      scrollable
      title="Contratos"
      showBack
      backTo={Routes.mas}
      right={isEstab ? (
        <HeaderButton label="Nuevo" icon={Plus} onPress={() => { haptic.medium(); router.push(Routes.contratoNuevo as never); }} />
      ) : undefined}
    />
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.brand} colors={[c.brand]} />}
      >
        {header}
        <View style={s.body}>
          {isLoading && pending.length === 0 && others.length === 0 ? (
            <View>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={[cs.rowCollapsed, i < 4 && cs.rowDivider]}>
                  <View style={cs.cardHeader}>
                    <View style={{ flex: 1, gap: space[1] + 2 }}>
                      <Skeleton width={80} height={18} borderRadius={radius.full} />
                      <Skeleton width="65%" height={14} />
                      <Skeleton width="45%" height={11} />
                    </View>
                    <Skeleton width={14} height={14} />
                  </View>
                </View>
              ))}
            </View>
          ) : isError && !contracts?.length ? (
            <ErrorState onRetry={refetch} />
          ) : !contracts?.length ? (
            <EmptyState
              icon="document-text-outline"
              title="Sin contratos"
              message={isEstab ? 'Creá un contrato digital para que el propietario lo firme desde la app.' : 'No tenés contratos pendientes por el momento.'}
            />
          ) : (
            <>
              {pending.length > 0 && (
                <View style={s.group}>
                  <Text style={s.groupLabel}>PENDIENTES ({pending.length})</Text>
                  {pending.map((ct, index) => (
                    <Animated.View key={ct.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <ContractRow contract={ct} userId={user?.id ?? ''}
                        onPress={() => router.push(Routes.contrato(ct.id) as never)}
                        isLast={index === pending.length - 1} c={c} cs={cs} />
                    </Animated.View>
                  ))}
                </View>
              )}
              {others.length > 0 && (
                <View style={s.group}>
                  <Text style={s.groupLabel}>HISTORIAL</Text>
                  {others.map((ct, index) => (
                    <Animated.View key={ct.id} entering={FadeInDown.duration(320).delay(Math.min(index, 8) * 45)}>
                      <ContractRow contract={ct} userId={user?.id ?? ''}
                        onPress={() => router.push(Routes.contrato(ct.id) as never)}
                        isLast={index === others.length - 1} c={c} cs={cs} />
                    </Animated.View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingBottom: 120 },
  body: { paddingHorizontal: space[4], paddingTop: space[2], gap: space[4] },
  group: { gap: 0 },
  groupLabel: { fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint, letterSpacing: 0.8, marginBottom: space[2] },
});

type CStyles = ReturnType<typeof makeCStyles>;

const makeCStyles = (c: ThemeColors) => StyleSheet.create({
  // Fila plana sobre el fondo de la pantalla: hace push al detalle.
  rowCollapsed: { backgroundColor: 'transparent' },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: c.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: space[4], gap: space[3] },
  docIcon: { width: space[8], alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { fontSize: text.base, fontWeight: weight.bold, color: c.text },
  meta: { fontSize: text.xs, color: c.textFaint },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: text.xs, fontWeight: weight.bold },
  horseBadge: { borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3, backgroundColor: c.surfaceAlt },
  horseText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },
  signedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginBottom: space[3], backgroundColor: c.successSoft, borderRadius: radius.md, padding: space[3] },
  signedText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.success },
  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginBottom: space[3], backgroundColor: c.warningSoft, borderRadius: radius.md, padding: space[3] },
  pendingText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.warning },
  rejectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: space[4], marginBottom: space[3], backgroundColor: c.dangerSoft, borderRadius: radius.md, padding: space[3] },
  rejectedText: { flex: 1, fontSize: text.xs, fontWeight: weight.semibold, color: c.danger },
});

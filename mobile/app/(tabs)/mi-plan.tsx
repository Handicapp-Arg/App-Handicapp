import { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, Pressable, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, Sparkles } from 'lucide-react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { Routes } from '../../lib/routes';
import {
  usePlanStatus, usePlanCatalog, useSubscribe, type Plan, type PlanRoleTarget,
} from '../../hooks/use-plan';

/** Extrae un mensaje de error legible de una respuesta de axios. */
function errMessage(err: unknown, fallback: string): string {
  const m = err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
    : null;
  return m || fallback;
}

const FEATURE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  libreta_digital: 'Libreta digital',
  reportes: 'Reportes',
  reproductivo: 'Módulo reproductivo',
};
const featureLabel = (key: string) => FEATURE_LABELS[key] ?? key;

function roleTargetFor(role?: string): PlanRoleTarget {
  if (role === 'veterinario') return 'veterinario';
  if (role === 'establecimiento') return 'establecimiento';
  if (role === 'haras') return 'haras';
  return 'propietario';
}

const fmtPrice = (ars: number) =>
  ars > 0 ? `$${ars.toLocaleString('es-AR')}/mes` : 'Gratis';

function FeatureChip({ label, c, s }: { label: string; c: ThemeColors; s: Styles }) {
  return (
    <View style={s.chip}>
      <Check size={12} color={c.brand} strokeWidth={3} />
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
}

function PlanCard({ plan, current, c, s }: { plan: Plan; current: boolean; c: ThemeColors; s: Styles }) {
  const subscribe = useSubscribe();
  const [error, setError] = useState('');
  // Solo se puede pagar un plan que no es el actual y que tiene precio.
  const canSubscribe = !current && plan.price_ars > 0;

  const handleSubscribe = async () => {
    setError('');
    try {
      const data = await subscribe.mutateAsync({ plan_id: plan.id });
      // Abre MercadoPago para autorizar el cobro.
      await Linking.openURL(data.init_point);
    } catch (err: unknown) {
      setError(errMessage(err, 'No se pudo iniciar el pago. MercadoPago no está configurado.'));
    }
  };

  return (
    <View style={[s.planCard, current && s.planCardCurrent]}>
      {current && (
        <View style={s.currentBadge}>
          <Text style={s.currentBadgeText}>TU PLAN</Text>
        </View>
      )}
      <View style={s.planCardTop}>
        <Text style={s.planName}>{plan.name}</Text>
        <Text style={s.planPrice}>{fmtPrice(plan.price_ars)}</Text>
      </View>
      <Text style={s.planLimit}>
        {plan.horse_limit == null ? 'Caballos ilimitados' : `Hasta ${plan.horse_limit} caballos`}
      </Text>
      {plan.features.length > 0 && (
        <View style={s.chipRow}>
          {plan.features.map((f) => <FeatureChip key={f} label={featureLabel(f)} c={c} s={s} />)}
        </View>
      )}
      {canSubscribe && (
        <View style={{ gap: space[2], marginTop: space[1] }}>
          <Pressable
            onPress={handleSubscribe}
            disabled={subscribe.isPending}
            style={({ pressed }) => [s.subBtn, (pressed || subscribe.isPending) && { opacity: 0.6 }]}
          >
            {subscribe.isPending ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={s.subBtnText}>Redirigiendo…</Text>
              </>
            ) : (
              <Text style={s.subBtnText}>Suscribirme</Text>
            )}
          </Pressable>
          {error ? <Text style={s.subError}>{error}</Text> : null}
        </View>
      )}
    </View>
  );
}

export default function MiPlanScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const { data: status, isLoading: loadingStatus } = usePlanStatus();
  const { data: catalog, isLoading: loadingCatalog } = usePlanCatalog();

  const roleTarget = roleTargetFor(user?.role);
  const myPlans = (catalog ?? [])
    .filter((p) => p.role_target === roleTarget)
    .sort((a, b) => a.tier - b.tier);

  const usagePct = status && status.horse_limit
    ? Math.min(1, status.horse_count / status.horse_limit)
    : 0;

  const expires = status?.plan_expires_at
    ? new Date(status.plan_expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={s.root}>
      <ScreenHeader title="Mi Plan" showBack backTo={Routes.mas} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Plan actual */}
        <Text style={s.sectionTitle}>Plan actual</Text>
        {loadingStatus || !status ? (
          <View style={s.loadingBox}><ActivityIndicator color={c.brand} /></View>
        ) : (
          <Animated.View entering={FadeInDown.duration(320)} style={s.currentCard}>
            <View style={s.currentHeader}>
              <View style={s.currentIcon}>
                <Sparkles size={20} color={colors.white} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.currentPlanName}>{status.label}</Text>
                <Text style={s.currentPlanSub}>
                  {status.price_ars > 0 ? fmtPrice(status.price_ars) : 'Plan gratuito'}
                  {expires ? ` · vence el ${expires}` : ''}
                </Text>
              </View>
            </View>

            {/* Uso de caballos */}
            <View style={s.usageBlock}>
              <View style={s.usageRow}>
                <Text style={s.usageLabel}>Caballos</Text>
                <Text style={s.usageValue}>
                  {status.horse_count}
                  {status.horse_limit == null ? ' · ilimitado' : ` / ${status.horse_limit}`}
                </Text>
              </View>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: status.horse_limit == null ? '100%' : `${Math.round(usagePct * 100)}%`,
                      backgroundColor: status.is_limited ? '#ef4444' : c.brand,
                    },
                  ]}
                />
              </View>
              {status.is_limited && (
                <Text style={s.limitWarn}>Alcanzaste el límite de caballos de tu plan.</Text>
              )}
            </View>

            {/* Features activas */}
            <Text style={s.featTitle}>Funciones incluidas</Text>
            {status.features.length > 0 ? (
              <View style={s.chipRow}>
                {status.features.map((f) => <FeatureChip key={f} label={featureLabel(f)} c={c} s={s} />)}
              </View>
            ) : (
              <Text style={s.emptyText}>Tu plan actual no incluye funciones adicionales.</Text>
            )}
          </Animated.View>
        )}

        {/* Catálogo del rol */}
        <Text style={[s.sectionTitle, { marginTop: space[6] }]}>Planes disponibles</Text>
        {loadingCatalog ? (
          <View style={s.loadingBox}><ActivityIndicator color={c.brand} /></View>
        ) : myPlans.length === 0 ? (
          <Text style={s.emptyText}>No hay planes disponibles para tu rol por ahora.</Text>
        ) : (
          <>
            <View style={{ gap: space[3] }}>
              {myPlans.map((p, i) => (
                <Animated.View key={p.id} entering={FadeInDown.duration(320).delay(Math.min(i, 6) * 50)}>
                  <PlanCard plan={p} current={status?.plan === p.tier_key} c={c} s={s} />
                </Animated.View>
              ))}
            </View>

            <Text style={s.payHint}>El pago se procesa de forma segura con MercadoPago.</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.bg },
  content: { padding: space[4], paddingBottom: space[12] },

  sectionTitle: {
    fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: space[3], paddingHorizontal: space[1],
  },

  loadingBox: {
    height: 100, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.border,
  },
  emptyText: { fontSize: text.sm, color: c.textFaint, paddingHorizontal: space[1] },

  /* Plan actual (destacado en cuero) */
  currentCard: {
    backgroundColor: c.brandSoft, borderRadius: radius.xl,
    borderWidth: 1.5, borderColor: c.brand,
    padding: space[4], gap: space[4], ...shadow.sm,
  },
  currentHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  currentIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center',
  },
  currentPlanName: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text },
  currentPlanSub: { fontSize: text.xs, color: c.textMuted, marginTop: 2 },

  usageBlock: { gap: space[2] },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  usageValue: { fontSize: text.sm, color: c.textMuted },
  progressTrack: {
    height: 8, borderRadius: radius.full, backgroundColor: c.surfaceAlt, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  limitWarn: { fontSize: text.xs, fontWeight: weight.medium, color: '#ef4444' },

  featTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.surface, borderRadius: radius.full,
    borderWidth: 1, borderColor: c.border,
    paddingHorizontal: space[2] + 2, paddingVertical: space[1] + 1,
  },
  chipText: { fontSize: text.xs, fontWeight: weight.semibold, color: c.text },

  /* Catálogo */
  planCard: {
    backgroundColor: c.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: c.border,
    padding: space[4], gap: space[2], ...shadow.sm,
  },
  planCardCurrent: { borderColor: c.brand, borderWidth: 1.5 },
  currentBadge: {
    position: 'absolute', top: -9, left: space[4],
    backgroundColor: c.brand, borderRadius: radius.full,
    paddingHorizontal: space[2] + 2, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 9, fontWeight: weight.bold, color: colors.white, letterSpacing: 0.5 },
  planCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  planName: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text },
  planPrice: { fontSize: text.sm, fontWeight: weight.bold, color: c.brand },
  planLimit: { fontSize: text.sm, color: c.textMuted },

  /* Suscripción */
  subBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: c.brand, borderRadius: radius.md,
    paddingHorizontal: space[5], paddingVertical: space[2] + 2,
  },
  subBtnText: { fontSize: text.sm, fontWeight: weight.bold, color: colors.white },
  subError: { fontSize: text.xs, fontWeight: weight.medium, color: '#ef4444' },

  payHint: { fontSize: text.xs, color: c.textFaint, textAlign: 'center', marginTop: space[4] },
});

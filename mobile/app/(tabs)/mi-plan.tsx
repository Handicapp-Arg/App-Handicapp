import { useMemo, useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator, Pressable, Linking,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Check, Rocket, Zap, Crown, Building2, Lock, ArrowRight,
  BarChart3, ClipboardPlus, Sprout,
} from 'lucide-react-native';
import { WhatsappLogo } from '../../components/icons/WhatsappLogo';
import { PaymentMethods } from '../../components/PaymentMethods';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
import { colors } from '../../lib/colors';
import { useTheme, type ThemeColors } from '../../lib/theme';
import { space, text, radius, weight, shadow } from '../../styles/tokens';
import { Routes } from '../../lib/routes';
import { formatMoney } from '../../lib/currency';
import {
  usePlanStatus, usePlanCatalog, useSubscribe, type Plan, type PlanRoleTarget,
} from '../../hooks/use-plan';
import { FormSheet } from '../../components/FormSheet';
import { vence } from '../../lib/fechas';

/** Extrae un mensaje de error legible de una respuesta de axios. */
function errMessage(err: unknown, fallback: string): string {
  const m = err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
    : null;
  return m || fallback;
}

/** Contacto de ventas para planes Enterprise (a medida, sin checkout self-serve). */
const SALES_MAILTO = 'mailto:ventas@handicapp.com?subject=Consulta%20plan%20Enterprise';

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
  ars > 0 ? `${formatMoney(ars)}/mes` : 'Gratis';

/* ─────────────────────────────────────────────────────────────
 * IDENTIDAD POR TIER
 * Cada tier se ve distinto: color, ícono, peso y destaque.
 * ───────────────────────────────────────────────────────────── */

type TierKind = 'free' | 'pro' | 'premium' | 'enterprise';

/** Deriva el tier de diseño desde `tier_key` (o el número `tier` como fallback). */
function tierKindOf(plan: { tier: number; tier_key?: string }): TierKind {
  const k = (plan.tier_key ?? '').toLowerCase();
  if (k.includes('enterprise') || k.includes('corporativo')) return 'enterprise';
  if (k.includes('premium')) return 'premium';
  if (k.includes('pro')) return 'pro';
  if (k.includes('free') || k.includes('gratis')) return 'free';
  return (['free', 'pro', 'premium', 'enterprise'][plan.tier] as TierKind) ?? 'free';
}

const TIER_KIND_LABEL: Record<TierKind, string> = {
  free: 'Gratis',
  pro: 'Pro',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

type TierMeta = {
  Icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  accent: string;        // color principal del tier (icono / franja / label)
  soft: string;          // fondo tint del acento
  featured: boolean;     // card destacada (Pro)
  badge: string | null;  // etiqueta especial ("Más elegido")
};

function tierMetaOf(kind: TierKind, c: ThemeColors): TierMeta {
  switch (kind) {
    case 'pro':
      // Único tier con identidad de marca (cuero): es el destacado.
      return {
        Icon: Zap, accent: c.brand, soft: c.brandSoft,
        featured: true, badge: 'Más elegido',
      };
    case 'premium':
      // Grafito/neutro (criterio web): sin morado.
      return {
        Icon: Crown, accent: c.text, soft: c.surfaceAlt,
        featured: false, badge: null,
      };
    case 'enterprise':
      // Grafito/neutro (criterio web): sin card oscura hardcodeada.
      return {
        Icon: Building2, accent: c.text, soft: c.surfaceAlt,
        featured: false, badge: null,
      };
    case 'free':
    default:
      return {
        Icon: Rocket, accent: c.textMuted, soft: c.surfaceAlt,
        featured: false, badge: null,
      };
  }
}

/* ─── Piezas reutilizables ─── */

/**
 * Glyph con SIGNIFICADO por feature (lucide), en el color de acento del tier.
 * WhatsApp NO pasa por acá: usa su logo real (verde) — se resuelve aparte.
 */
function FeatureGlyph({
  featureKey, accent, size = 11,
}: { featureKey?: string; accent: string; size?: number }) {
  switch (featureKey) {
    case 'reportes':
      return <BarChart3 size={size + 1} color={accent} strokeWidth={2.6} />;
    case 'libreta_digital':
      return <ClipboardPlus size={size + 1} color={accent} strokeWidth={2.4} />;
    case 'reproductivo':
      return <Sprout size={size + 1} color={accent} strokeWidth={2.4} />;
    default:
      return <Check size={size} color={accent} strokeWidth={3.4} />;
  }
}

/** Fila de feature con ícono con significado del color del tier (soporta fondo oscuro). */
function FeatureRow({
  label, featureKey, accent, soft, textColor, s,
}: {
  label: string; featureKey?: string; accent: string; soft: string;
  textColor: string; s: Styles;
}) {
  return (
    <View style={s.featRow}>
      {featureKey === 'whatsapp' ? (
        <WhatsappLogo size={18} />
      ) : (
        <View style={[s.featCheck, { backgroundColor: soft }]}>
          <FeatureGlyph featureKey={featureKey} accent={accent} />
        </View>
      )}
      <Text style={[s.featRowText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 * PLAN CARD — con identidad por tier
 * ───────────────────────────────────────────────────────────── */

function PlanCardInner({
  plan, current, onSubscribe, c, s,
}: {
  plan: Plan; current: boolean; onSubscribe: (p: Plan) => void; c: ThemeColors; s: Styles;
}) {
  const kind = tierKindOf(plan);
  const m = tierMetaOf(kind, c);
  const { accent, soft } = m;
  const Icon = m.Icon;
  const paid = plan.price_ars > 0;

  const horseLabel = plan.horse_limit == null
    ? 'Caballos ilimitados'
    : `${plan.horse_limit} caballos`;
  const staffLabel = plan.staff_limit == null
    ? null
    : plan.staff_limit === 0 ? 'Sin equipo' : `${plan.staff_limit} en el equipo`;

  return (
    <>
      {/* Encabezado: ícono del tier + nombre; el estado va como texto bajo el nombre */}
      <View style={s.cardHead}>
        <View style={[s.tierIcon, { backgroundColor: soft }]}>
          <Icon size={20} color={accent} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.planName, { color: c.text }]}>{plan.name}</Text>
          <Text style={s.tierKindLabel}>
            {current ? 'Tu plan' : m.badge ?? TIER_KIND_LABEL[kind]}
          </Text>
        </View>
      </View>

      {/* Precio prominente */}
      <View style={s.priceRow}>
        {paid ? (
          <>
            <Text style={[s.priceBig, { color: c.text }]}>
              {formatMoney(plan.price_ars)}
            </Text>
            <Text style={[s.priceUnit, { color: c.textFaint }]}>/mes</Text>
          </>
        ) : (
          <Text style={[s.priceBig, { color: c.text }]}>Gratis</Text>
        )}
      </View>

      {/* Límites y features: una sola forma, checklist de filas */}
      <View style={s.featList}>
        <FeatureRow label={horseLabel} accent={accent} soft={soft} textColor={c.textMuted} s={s} />
        {staffLabel && (
          <FeatureRow label={staffLabel} accent={accent} soft={soft} textColor={c.textMuted} s={s} />
        )}
        {plan.features.slice(0, 3).map((f) => (
          <FeatureRow
            key={f} label={featureLabel(f)} featureKey={f}
            accent={accent} soft={soft} textColor={c.textMuted} s={s}
          />
        ))}
        {plan.features.length > 3 && (
          <Text style={s.masBeneficios}>y {plan.features.length - 3} beneficios más</Text>
        )}
      </View>

      {/* CTA: cuero solo en el plan destacado; el resto en superficie neutra */}
      {current ? (
        <Text style={s.stateText}>Plan actual</Text>
      ) : kind === 'enterprise' ? (
        <Pressable
          onPress={() => { haptic.medium(); Linking.openURL(SALES_MAILTO); }}
          style={({ pressed }) => [
            s.subBtn,
            { backgroundColor: m.featured ? c.brand : c.surfaceAlt },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={[s.subBtnText, { color: m.featured ? colors.white : c.text }]}>
            Contactar ventas
          </Text>
          <ArrowRight size={16} color={m.featured ? colors.white : c.text} strokeWidth={2.6} />
        </Pressable>
      ) : paid ? (
        <Pressable
          onPress={() => { haptic.medium(); onSubscribe(plan); }}
          style={({ pressed }) => [
            s.subBtn,
            { backgroundColor: m.featured ? c.brand : c.surfaceAlt },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={[s.subBtnText, { color: m.featured ? colors.white : c.text }]}>
            Suscribirme
          </Text>
          <ArrowRight size={16} color={m.featured ? colors.white : c.text} strokeWidth={2.6} />
        </Pressable>
      ) : (
        <Text style={s.stateText}>Incluido</Text>
      )}
    </>
  );
}

/** Wrapper de la card: superficie sólida theme-aware con sombra suave, sin realces. */
function PlanCard({
  plan, current, onSubscribe, c, s,
}: {
  plan: Plan; current: boolean; onSubscribe: (p: Plan) => void; c: ThemeColors; s: Styles;
}) {
  return (
    <View style={s.planCard}>
      <PlanCardInner plan={plan} current={current} onSubscribe={onSubscribe} c={c} s={s} />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CHECKOUT SHEET — medios de pago tipo checkout real
 * Reusa el hook de suscripción existente (NO captura datos de tarjeta).
 * ───────────────────────────────────────────────────────────── */

function CheckoutSheet({
  visible, plan, onClose, c, s,
}: { visible: boolean; plan: Plan | null; onClose: () => void; c: ThemeColors; s: Styles }) {
  const subscribe = useSubscribe();
  const [error, setError] = useState('');

  // El FormSheet ya no se destruye al cerrarse: limpiamos el error al abrir.
  useEffect(() => {
    if (!visible) return;
    setError('');
  }, [visible]);

  const kind = plan ? tierKindOf(plan) : 'free';
  const m = tierMetaOf(kind, c);
  const Icon = m.Icon;

  // Bullets de "qué incluye" (2-3): caballos, equipo, features (con su clave para el ícono).
  const bullets: { label: string; key?: string }[] = plan ? [
    { label: plan.horse_limit == null ? 'Caballos ilimitados' : `Hasta ${plan.horse_limit} caballos` },
    ...(plan.staff_limit != null && plan.staff_limit > 0 ? [{ label: `Hasta ${plan.staff_limit} en el equipo` }] : []),
    ...plan.features.slice(0, 2).map((f) => ({ label: featureLabel(f), key: f })),
  ] : [];

  const handlePay = async () => {
    if (!plan) return;
    setError('');
    try {
      const data = await subscribe.mutateAsync({ plan_id: plan.id });
      await Linking.openURL(data.init_point);
      onClose();
    } catch (err: unknown) {
      setError(errMessage(err, 'No pudimos iniciar el pago. Probá de nuevo en unos minutos.'));
    }
  };

  return (
    <FormSheet
      visible={visible}
      onClose={onClose}
      title="Confirmar suscripción"
      footer={plan ? (
        <View style={{ flex: 1, gap: space[2] }}>
          <Pressable
            onPress={handlePay}
            disabled={subscribe.isPending}
            style={({ pressed }) => [s.payBtn, (pressed || subscribe.isPending) && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={subscribe.isPending ? 'Redirigiendo al pago' : 'Ir al pago seguro'}
          >
            {subscribe.isPending ? (
              <>
                <ActivityIndicator size="small" color={colors.white} />
                <Text style={s.payBtnText}>Redirigiendo…</Text>
              </>
            ) : (
              <>
                <Lock size={16} color={colors.white} strokeWidth={2.6} />
                <Text style={s.payBtnText}>Ir al pago seguro</Text>
              </>
            )}
          </Pressable>
          {error ? <Text style={s.subError}>{error}</Text> : null}
        </View>
      ) : null}
    >
      {plan ? (
        <>
          {/* Resumen del plan */}
          <View style={[s.summaryCard, { backgroundColor: m.soft }]}>
            <View style={[s.tierIcon, { backgroundColor: c.surface }]}>
              <Icon size={20} color={m.accent} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.summaryName}>{plan.name}</Text>
              <Text style={[s.summaryTier, { color: m.accent }]}>
                {TIER_KIND_LABEL[kind].toUpperCase()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.summaryPrice}>{formatMoney(plan.price_ars)}</Text>
              <Text style={s.summaryUnit}>/mes</Text>
            </View>
          </View>

          {/* Qué incluye */}
          <View style={{ gap: space[2] + 2 }}>
            {bullets.slice(0, 3).map((b) => (
              <FeatureRow
                key={b.label} label={b.label} featureKey={b.key}
                accent={m.accent} soft={m.soft} textColor={c.textMuted} s={s}
              />
            ))}
          </View>

          {/* Medios de pago */}
          <View style={{ gap: space[2] }}>
            <Text style={s.sheetLabel}>Medios de pago</Text>
            <PaymentMethods />
          </View>

          {/* Nota de seguridad */}
          <View style={s.secureNote}>
            <Lock size={15} color={c.brand} strokeWidth={2.4} />
            <Text style={s.secureNoteText}>
              Pago seguro procesado por MercadoPago. Tus datos de tarjeta
              no se guardan en HandicApp.
            </Text>
          </View>

        </>
      ) : null}
    </FormSheet>
  );
}

/* ─────────────────────────────────────────────────────────────
 * PANTALLA
 * ───────────────────────────────────────────────────────────── */

export default function MiPlanScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  const { data: status, isLoading: loadingStatus } = usePlanStatus();
  const { data: catalog, isLoading: loadingCatalog } = usePlanCatalog();

  const roleTarget = roleTargetFor(user?.role);
  const myPlans = (catalog ?? [])
    .filter((p) => p.role_target === roleTarget)
    .sort((a, b) => a.tier - b.tier);

  // Plan actual (para derivar identidad del tier del bloque superior).
  const currentPlan = myPlans.find((p) => p.tier_key === status?.plan);
  const currentMeta = currentPlan
    ? tierMetaOf(tierKindOf(currentPlan), c)
    : tierMetaOf('free', c);
  const CurrentIcon = currentMeta.Icon;

  const usagePct = status && status.horse_limit
    ? Math.min(1, status.horse_count / status.horse_limit)
    : 0;

  const expires = status?.plan_expires_at
    ? vence(status.plan_expires_at)
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
                <CurrentIcon size={22} color={c.text} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.currentPlanName}>{status.label}</Text>
                <Text style={s.currentPlanSub}>
                  {status.price_ars > 0 ? fmtPrice(status.price_ars) : 'Plan gratuito'}
                  {expires ? ` · ${expires}` : ''}
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
                      backgroundColor: status.is_limited ? c.danger : c.brand,
                    },
                  ]}
                />
              </View>
              {status.is_limited && (
                <Text style={s.limitWarn}>Alcanzaste el límite de caballos de tu plan.</Text>
              )}
            </View>

            {/* Features activas — misma forma que las cards: checklist de filas */}
            <Text style={s.featTitle}>Funciones incluidas</Text>
            {status.features.length > 0 ? (
              <View style={{ gap: space[2] + 2 }}>
                {status.features.map((f) => (
                  <FeatureRow
                    key={f} label={featureLabel(f)} featureKey={f}
                    accent={currentMeta.accent} soft={currentMeta.soft} textColor={c.textMuted} s={s}
                  />
                ))}
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
                  <PlanCard
                    plan={p}
                    current={status?.plan === p.tier_key}
                    onSubscribe={setCheckoutPlan}
                    c={c} s={s}
                  />
                </Animated.View>
              ))}
            </View>

            {/* Sello de confianza: medios de pago */}
            <View style={s.trustSeal}>
              <PaymentMethods size="sm" style={{ justifyContent: 'center' }} />
              <Text style={s.payHint}>Pagás con tarjeta vía MercadoPago</Text>
            </View>
          </>
        )}
      </ScrollView>

      <CheckoutSheet visible={!!checkoutPlan} plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} c={c} s={s} />
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  masBeneficios: { fontSize: text.sm, color: c.textFaint, marginTop: 2, marginLeft: 30 },
  root: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: 120 },

  sectionTitle: {
    fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: space[3], paddingHorizontal: space[1],
  },

  loadingBox: {
    height: 100, alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { fontSize: text.sm, color: c.textFaint, paddingHorizontal: space[1] },

  /* Plan actual — aplanado: vive directo sobre c.bg, el ícono en cuero es el acento */
  currentCard: { gap: space[4] },
  currentHeader: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  // Sin fondo: el glifo solo alcanza (cuero reservado para el CTA).
  currentIcon: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  currentPlanName: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text },
  currentPlanSub: { fontSize: text.xs, color: c.textMuted, marginTop: 2 },

  usageBlock: { gap: space[2] },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usageLabel: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },
  usageValue: { fontSize: text.sm, color: c.textMuted, fontVariant: ['tabular-nums'] },
  progressTrack: {
    height: 8, borderRadius: radius.full, backgroundColor: c.surfaceAlt, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.full },
  limitWarn: { fontSize: text.xs, fontWeight: weight.medium, color: c.danger },

  featTitle: { fontSize: text.sm, fontWeight: weight.semibold, color: c.text },

  /* ─── Plan cards: superficie + sombra suave, sin franjas ni badges flotantes ─── */
  planCard: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    padding: space[4], paddingTop: space[5], gap: space[3],
    overflow: 'hidden', ...shadow.sm,
  },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tierIcon: {
    width: 42, height: 42, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  planName: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text },
  tierKindLabel: {
    fontSize: text.xs, fontWeight: weight.semibold, color: c.textMuted,
    letterSpacing: 0.2, marginTop: 1,
  },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  priceBig: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  priceUnit: { fontSize: text.sm, fontWeight: weight.medium, color: c.textFaint },

  featList: {
    gap: space[2] + 2, marginTop: space[1], paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] + 2 },
  featCheck: {
    width: 18, height: 18, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  featRowText: { flex: 1, fontSize: text.sm, color: c.textMuted },

  stateText: {
    marginTop: space[1], paddingVertical: space[2] + 2,
    textAlign: 'center', fontSize: text.sm, fontWeight: weight.medium, color: c.textFaint,
  },

  subBtn: {
    marginTop: space[1], flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2], borderRadius: radius.md,
    paddingHorizontal: space[5], paddingVertical: space[3],
  },
  subBtnText: { fontSize: text.sm, fontWeight: weight.semibold },
  subError: { fontSize: text.xs, fontWeight: weight.medium, color: c.danger, textAlign: 'center' },

  /* Sello de confianza */
  trustSeal: { marginTop: space[5], alignItems: 'center', gap: space[2] },
  payHint: { fontSize: text.xs, color: c.textFaint, textAlign: 'center' },

  /* ─── Checkout sheet (FormSheet) ─── */
  sheetLabel: {
    fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderRadius: radius.lg, padding: space[3],
  },
  summaryName: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text },
  summaryTier: { fontSize: text.xs, fontWeight: weight.semibold, letterSpacing: 0.2, marginTop: 1 },
  summaryPrice: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  summaryUnit: { fontSize: text.xs, color: c.textFaint },

  secureNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space[2],
    backgroundColor: c.brandSoft, borderRadius: radius.md,
    padding: space[3],
  },
  secureNoteText: { flex: 1, fontSize: text.xs, color: c.textMuted, lineHeight: 17 },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: c.brand, borderRadius: radius.md, paddingVertical: space[3] + 2,
    ...shadow.sm,
  },
  payBtnText: { fontSize: text.base, fontWeight: weight.semibold, color: colors.white },
});

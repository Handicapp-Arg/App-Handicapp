import { useMemo, useState, type ComponentType } from 'react';
import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator, Pressable, Linking, Modal,
} from 'react-native';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Check, Rocket, Zap, Crown, Building2, Lock, Users, ArrowRight, X,
  BarChart3, ClipboardPlus, Sprout,
} from 'lucide-react-native';
import { HorseIcon } from '../../components/icons/equine';
import { WhatsappLogo } from '../../components/icons/WhatsappLogo';
import { PaymentMethods } from '../../components/PaymentMethods';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth } from '../../lib/auth';
import { haptic } from '../../lib/haptics';
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
  accent: string;        // color principal del tier
  soft: string;          // fondo tint del acento
  onDark: boolean;       // la card tiene fondo oscuro (texto claro)
  gradient: readonly [string, string] | null;
  featured: boolean;     // card destacada (Pro)
  badge: string | null;  // etiqueta especial ("Más elegido")
};

function tierMetaOf(kind: TierKind, c: ThemeColors): TierMeta {
  switch (kind) {
    case 'pro':
      return {
        Icon: Zap, accent: c.brand, soft: c.brandSoft, onDark: false,
        gradient: null, featured: true, badge: 'Más elegido',
      };
    case 'premium':
      return {
        Icon: Crown,
        accent: c.isDark ? '#a78bfa' : '#7c3aed',
        soft: c.isDark ? 'rgba(167,139,250,0.16)' : 'rgba(124,58,237,0.10)',
        onDark: false, gradient: null, featured: false, badge: null,
      };
    case 'enterprise':
      return {
        Icon: Building2, accent: '#cbd5e1', soft: 'rgba(255,255,255,0.10)',
        onDark: true, gradient: ['#1e293b', '#0f172a'] as const,
        featured: false, badge: null,
      };
    case 'free':
    default:
      return {
        Icon: Rocket, accent: c.textMuted, soft: c.surfaceAlt,
        onDark: false, gradient: null, featured: false, badge: null,
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

function FeatureChip({
  label, featureKey, c, s,
}: { label: string; featureKey?: string; c: ThemeColors; s: Styles }) {
  return (
    <View style={s.chip}>
      {featureKey === 'whatsapp'
        ? <WhatsappLogo size={14} />
        : <FeatureGlyph featureKey={featureKey} accent={c.brand} size={12} />}
      <Text style={s.chipText}>{label}</Text>
    </View>
  );
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
  const { onDark, accent, soft } = m;
  const Icon = m.Icon;
  const paid = plan.price_ars > 0;

  const nameColor = onDark ? '#f8fafc' : c.text;
  const priceColor = onDark ? '#f8fafc' : c.text;
  const unitColor = onDark ? 'rgba(248,250,252,0.6)' : c.textFaint;
  const featTextColor = onDark ? 'rgba(248,250,252,0.78)' : c.textMuted;
  const chipBg = onDark ? 'rgba(255,255,255,0.08)' : soft;
  const chipText = onDark ? '#e2e8f0' : c.text;
  const divider = onDark ? 'rgba(255,255,255,0.12)' : c.border;

  const horseLabel = plan.horse_limit == null
    ? 'Caballos ilimitados'
    : `${plan.horse_limit} caballos`;
  const staffLabel = plan.staff_limit == null
    ? null
    : plan.staff_limit === 0 ? 'Sin equipo' : `${plan.staff_limit} en el equipo`;

  return (
    <>
      {/* Franja de acento superior */}
      <View style={[s.accentStripe, { backgroundColor: accent }]} />

      {/* Badge esquina: plan actual o "Más elegido" */}
      {current ? (
        <View style={[s.cornerBadge, { backgroundColor: accent }]}>
          <Text style={s.cornerBadgeText}>Tu plan</Text>
        </View>
      ) : m.badge ? (
        <View style={[s.cornerBadge, { backgroundColor: accent }]}>
          <Text style={s.cornerBadgeText}>{m.badge}</Text>
        </View>
      ) : null}

      {/* Encabezado: ícono del tier + nombre */}
      <View style={s.cardHead}>
        <View style={[s.tierIcon, {
          backgroundColor: soft,
          borderColor: onDark ? 'rgba(255,255,255,0.16)' : accent + '33',
        }]}>
          <Icon size={20} color={accent} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.planName, { color: nameColor }]}>{plan.name}</Text>
          <Text style={[s.tierKindLabel, { color: accent }]}>
            {TIER_KIND_LABEL[kind].toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Precio prominente */}
      <View style={s.priceRow}>
        {paid ? (
          <>
            <Text style={[s.priceBig, { color: priceColor }]}>
              ${plan.price_ars.toLocaleString('es-AR')}
            </Text>
            <Text style={[s.priceUnit, { color: unitColor }]}>/mes</Text>
          </>
        ) : (
          <Text style={[s.priceBig, { color: priceColor }]}>Gratis</Text>
        )}
      </View>

      {/* Límites como chips */}
      <View style={s.limitChips}>
        <View style={[s.limitChip, { backgroundColor: chipBg }]}>
          <HorseIcon size={13} color={accent} />
          <Text style={[s.limitChipText, { color: chipText }]}>{horseLabel}</Text>
        </View>
        {staffLabel && (
          <View style={[s.limitChip, { backgroundColor: chipBg }]}>
            <Users size={13} color={accent} strokeWidth={2.4} />
            <Text style={[s.limitChipText, { color: chipText }]}>{staffLabel}</Text>
          </View>
        )}
      </View>

      {/* Features como checklist con el color del tier */}
      {plan.features.length > 0 && (
        <View style={[s.featList, { borderTopColor: divider }]}>
          {plan.features.map((f) => (
            <FeatureRow
              key={f} label={featureLabel(f)} featureKey={f}
              accent={accent} soft={soft} textColor={featTextColor} s={s}
            />
          ))}
        </View>
      )}

      {/* CTA */}
      {current ? (
        <View style={[s.statePill, {
          backgroundColor: chipBg,
          borderColor: onDark ? 'rgba(255,255,255,0.14)' : c.borderStrong,
        }]}>
          <Text style={[s.statePillText, { color: onDark ? '#e2e8f0' : c.textMuted }]}>
            Plan actual
          </Text>
        </View>
      ) : paid ? (
        <Pressable
          onPress={() => { haptic.medium(); onSubscribe(plan); }}
          style={({ pressed }) => [
            s.subBtn,
            { backgroundColor: onDark ? '#f8fafc' : accent },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={[s.subBtnText, { color: onDark ? '#0f172a' : colors.white }]}>
            Suscribirme
          </Text>
          <ArrowRight size={16} color={onDark ? '#0f172a' : colors.white} strokeWidth={2.6} />
        </Pressable>
      ) : (
        <View style={[s.statePill, { backgroundColor: chipBg, borderColor: c.borderStrong }]}>
          <Text style={[s.statePillText, { color: c.textFaint }]}>Incluido</Text>
        </View>
      )}
    </>
  );
}

/** Wrapper de la card: gradiente oscuro para Enterprise, sólido para el resto. */
function PlanCard({
  plan, current, onSubscribe, c, s,
}: {
  plan: Plan; current: boolean; onSubscribe: (p: Plan) => void; c: ThemeColors; s: Styles;
}) {
  const kind = tierKindOf(plan);
  const m = tierMetaOf(kind, c);

  const frameStyle = [
    s.planCard,
    m.featured && [s.planCardFeatured, { borderColor: m.accent }],
    current && !m.onDark && { borderColor: m.accent, borderWidth: 1.5 },
  ];

  if (m.gradient) {
    return (
      <LinearGradient
        colors={m.gradient}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.planCard, s.planCardDark]}
      >
        <PlanCardInner plan={plan} current={current} onSubscribe={onSubscribe} c={c} s={s} />
      </LinearGradient>
    );
  }

  return (
    <View style={frameStyle}>
      <PlanCardInner plan={plan} current={current} onSubscribe={onSubscribe} c={c} s={s} />
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────
 * CHECKOUT SHEET — medios de pago tipo checkout real
 * Reusa el hook de suscripción existente (NO captura datos de tarjeta).
 * ───────────────────────────────────────────────────────────── */

function CheckoutSheet({
  plan, onClose, c, s,
}: { plan: Plan; onClose: () => void; c: ThemeColors; s: Styles }) {
  const subscribe = useSubscribe();
  const [error, setError] = useState('');

  const kind = tierKindOf(plan);
  const m = tierMetaOf(kind, c);
  const Icon = m.Icon;

  // Bullets de "qué incluye" (2-3): caballos, equipo, features (con su clave para el ícono).
  const bullets: { label: string; key?: string }[] = [
    { label: plan.horse_limit == null ? 'Caballos ilimitados' : `Hasta ${plan.horse_limit} caballos` },
  ];
  if (plan.staff_limit != null && plan.staff_limit > 0) bullets.push({ label: `Hasta ${plan.staff_limit} en el equipo` });
  plan.features.slice(0, 2).forEach((f) => bullets.push({ label: featureLabel(f), key: f }));

  const handlePay = async () => {
    setError('');
    try {
      const data = await subscribe.mutateAsync({ plan_id: plan.id });
      await Linking.openURL(data.init_point);
      onClose();
    } catch (err: unknown) {
      setError(errMessage(err, 'No se pudo iniciar el pago. MercadoPago no está configurado.'));
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.sheetOverlay} onPress={onClose}>
        <Animated.View entering={SlideInDown.springify().damping(26).stiffness(190)}>
          {/* swallow: los toques dentro del sheet no cierran */}
          <Pressable style={s.sheet} onPress={() => {}}>
            <View style={s.sheetGrabber} />

            <View style={s.sheetHeadRow}>
              <Text style={s.sheetTitle}>Confirmar suscripción</Text>
              <Pressable onPress={onClose} hitSlop={10} style={s.sheetClose}>
                <X size={18} color={c.textMuted} strokeWidth={2.4} />
              </Pressable>
            </View>

            {/* Resumen del plan */}
            <View style={[s.summaryCard, { borderColor: m.accent + '55', backgroundColor: m.soft }]}>
              <View style={[s.tierIcon, {
                backgroundColor: c.surface, borderColor: m.accent + '44',
              }]}>
                <Icon size={20} color={m.accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.summaryName}>{plan.name}</Text>
                <Text style={[s.summaryTier, { color: m.accent }]}>
                  {TIER_KIND_LABEL[kind].toUpperCase()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.summaryPrice}>${plan.price_ars.toLocaleString('es-AR')}</Text>
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
                Pago 100% seguro. Tus datos de tarjeta los procesa MercadoPago,
                no se guardan en HandicApp.
              </Text>
            </View>

            {/* CTA pago */}
            <Pressable
              onPress={handlePay}
              disabled={subscribe.isPending}
              style={({ pressed }) => [s.payBtn, (pressed || subscribe.isPending) && { opacity: 0.7 }]}
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
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
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
              <View style={[s.currentIcon, { backgroundColor: currentMeta.accent }]}>
                <CurrentIcon size={20} color={colors.white} strokeWidth={2.2} />
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
                {status.features.map((f) => <FeatureChip key={f} label={featureLabel(f)} featureKey={f} c={c} s={s} />)}
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

      {checkoutPlan && (
        <CheckoutSheet plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} c={c} s={s} />
      )}
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
    alignItems: 'center', justifyContent: 'center',
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

  /* ─── Plan cards con identidad ─── */
  planCard: {
    backgroundColor: c.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: c.border,
    padding: space[4], paddingTop: space[5], gap: space[3],
    overflow: 'hidden', ...shadow.sm,
  },
  planCardFeatured: {
    borderWidth: 2, transform: [{ scale: 1.015 }], ...shadow.md,
  },
  planCardDark: {
    borderWidth: 0, ...shadow.md,
  },
  accentStripe: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
  },
  cornerBadge: {
    position: 'absolute', top: space[3], right: space[3],
    borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: 3,
    zIndex: 2,
  },
  cornerBadgeText: {
    fontSize: 10, fontWeight: weight.bold, color: colors.white, letterSpacing: 0.4,
  },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tierIcon: {
    width: 42, height: 42, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  planName: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text },
  tierKindLabel: { fontSize: 10, fontWeight: weight.bold, letterSpacing: 0.6, marginTop: 1 },

  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  priceBig: { fontSize: text['2xl'], fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.5 },
  priceUnit: { fontSize: text.sm, fontWeight: weight.medium, color: c.textFaint },

  limitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  limitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, paddingHorizontal: space[2] + 2, paddingVertical: space[1] + 2,
  },
  limitChipText: { fontSize: text.xs, fontWeight: weight.semibold },

  featList: {
    gap: space[2] + 2, marginTop: space[1], paddingTop: space[3], borderTopWidth: 1,
  },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] + 2 },
  featCheck: {
    width: 18, height: 18, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  featRowText: { flex: 1, fontSize: text.sm, color: c.textMuted },

  statePill: {
    marginTop: space[1], borderRadius: radius.md, borderWidth: 1,
    paddingVertical: space[2] + 2, alignItems: 'center',
  },
  statePillText: { fontSize: text.sm, fontWeight: weight.semibold },

  subBtn: {
    marginTop: space[1], flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[2], borderRadius: radius.md,
    paddingHorizontal: space[5], paddingVertical: space[3],
  },
  subBtnText: { fontSize: text.sm, fontWeight: weight.bold },
  subError: { fontSize: text.xs, fontWeight: weight.medium, color: '#ef4444', textAlign: 'center' },

  /* Sello de confianza */
  trustSeal: { marginTop: space[5], alignItems: 'center', gap: space[2] },
  payHint: { fontSize: text.xs, color: c.textFaint, textAlign: 'center' },

  /* ─── Checkout sheet ─── */
  sheetOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'],
    padding: space[5], paddingBottom: space[10], gap: space[4],
    borderTopWidth: 1, borderColor: c.border,
  },
  sheetGrabber: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: radius.full,
    backgroundColor: c.borderStrong, marginBottom: space[1],
  },
  sheetHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text },
  sheetClose: {
    width: 32, height: 32, borderRadius: radius.full,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  sheetLabel: {
    fontSize: text.xs, fontWeight: weight.bold, color: c.textFaint,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: space[3],
    borderRadius: radius.lg, borderWidth: 1, padding: space[3],
  },
  summaryName: { fontSize: text.md, fontWeight: weight.extrabold, color: c.text },
  summaryTier: { fontSize: 10, fontWeight: weight.bold, letterSpacing: 0.6, marginTop: 1 },
  summaryPrice: { fontSize: text.lg, fontWeight: weight.extrabold, color: c.text, letterSpacing: -0.3 },
  summaryUnit: { fontSize: text.xs, color: c.textFaint },

  secureNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space[2],
    backgroundColor: c.brandSoft, borderRadius: radius.md,
    padding: space[3], borderWidth: 1, borderColor: c.brand + '33',
  },
  secureNoteText: { flex: 1, fontSize: text.xs, color: c.textMuted, lineHeight: 17 },

  payBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2],
    backgroundColor: c.brand, borderRadius: radius.md, paddingVertical: space[3] + 2,
    ...shadow.sm,
  },
  payBtnText: { fontSize: text.base, fontWeight: weight.bold, color: colors.white },
});

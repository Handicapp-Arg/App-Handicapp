'use client';

import { useState, useRef, type ComponentType } from 'react';
import { Rocket, Zap, Crown, Building2, Lock, ShieldCheck, Check, BarChart3, ClipboardPlus, Sprout, Camera, Eye, EyeOff, Mail, Star } from 'lucide-react';
import { WhatsApp } from '@/components/icons/whatsapp';
import { useAuth } from '@/lib/auth-context';
import { avatarGradient, initialsOf, AVATAR_PALETTE } from '@/lib/avatar-color';
import { useFeed } from '@/hooks/use-feed';
import PostCard from '@/components/feed/PostCard';
import api from '@/lib/api';
import { formatMoney } from '@/lib/currency';
import { Spinner } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { Container } from '@/components/ui/container';
import { VetVerifiedBadge, isVetVerified } from '@/components/ui/verified-badge';
import { Avatar } from '@/components/ui/avatar';
import { RoleBadge } from '@/components/ui/role-badge';
import { PaymentMethods } from '@/components/ui/payment-methods';
import { usePlanStatus, usePlanCatalog, useSubscribe, type Plan, type PlanRoleTarget } from '@/hooks/use-plan';
import { PLAN_LABELS } from '@/hooks/use-organizations';

/** Traducción de las keys de features del backend a labels legibles. */
const FEATURE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  libreta_digital: 'Libreta digital',
  reportes: 'Reportes',
  reproductivo: 'Módulo reproductivo',
};
const featureLabel = (key: string) => FEATURE_LABELS[key] ?? key;

/** Cada feature con SU ícono intencional (no un check genérico para todas).
 *  `whatsapp` se maneja aparte porque usa el logo de marca a color. */
const FEATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  reportes: BarChart3,
  libreta_digital: ClipboardPlus,
  reproductivo: Sprout,
};

/** Rol del usuario → role_target del catálogo de planes. */
function roleTargetFor(role?: string): PlanRoleTarget {
  if (role === 'veterinario') return 'veterinario';
  if (role === 'establecimiento') return 'establecimiento';
  if (role === 'haras') return 'haras';
  return 'propietario';
}

const fmtPrice = (ars: number) =>
  ars > 0 ? `${formatMoney(ars)}/mes` : 'Gratis';

/** Contacto de ventas para planes Enterprise (a medida, sin checkout self-serve). */
const SALES_MAILTO = 'mailto:ventas@handicapp.com?subject=Consulta%20plan%20Enterprise';

/** Nombre visual del tier (badge) derivado del número de tier del plan.
 *  Usa el mapa canónico de labels de plan (una sola fuente de verdad). */
const TIER_KEYS = ['free', 'pro', 'premium', 'enterprise'] as const;
const tierName = (tier: number) => PLAN_LABELS[TIER_KEYS[tier]] ?? `Nivel ${tier + 1}`;

/* ─── Identidad visual por tier ───
   Cada plan se reconoce de un vistazo: color, ícono, peso y personalidad
   propios. Los tints son translúcidos (rgba / var) → dark-safe. */
type TierId = 'free' | 'pro' | 'premium' | 'enterprise';

interface TierStyle {
  id: TierId;
  label: string;
  tagline: string;
  Icon: ComponentType<{ className?: string }>;
  accent: string; // color sólido del acento (íconos, checks, barra)
  tint: string; // fondo translúcido del círculo del ícono
  ring: string; // borde/anillo del tier
  glow: string; // sombra de color en hover
  bar: string; // franja superior de color
  featured?: boolean; // Pro → card destacada + badge
  badge?: string;
}

const TIER_STYLES: Record<TierId, TierStyle> = {
  free: {
    id: 'free',
    label: 'Free',
    tagline: 'Para empezar',
    Icon: Rocket,
    accent: '#64748b',
    tint: 'rgba(100,116,139,0.14)',
    ring: 'rgba(100,116,139,0.35)',
    glow: 'rgba(100,116,139,0.22)',
    bar: 'linear-gradient(90deg, #94a3b8, #64748b)',
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    tagline: 'El favorito de los profesionales',
    Icon: Zap,
    accent: 'var(--color-primary)',
    tint: 'rgba(157,108,53,0.16)',
    ring: 'var(--color-primary)',
    glow: 'rgba(157,108,53,0.38)',
    bar: 'linear-gradient(90deg, #d2aa78, #9d6c35)',
    featured: true,
    badge: 'Más elegido',
  },
  premium: {
    id: 'premium',
    label: 'Premium',
    tagline: 'Todo lo que necesitás',
    Icon: Crown,
    accent: '#334155',
    tint: 'rgba(51,65,85,0.14)',
    ring: 'rgba(51,65,85,0.4)',
    glow: 'rgba(51,65,85,0.28)',
    bar: 'linear-gradient(90deg, #64748b, #334155)',
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    tagline: 'A la medida de tu operación',
    Icon: Building2,
    accent: '#475569',
    tint: 'linear-gradient(135deg, #334155, #0f172a)',
    ring: 'rgba(51,65,85,0.55)',
    glow: 'rgba(30,41,59,0.45)',
    bar: 'linear-gradient(90deg, #475569, #0f172a)',
  },
};

/** Deriva el tier visual del plan (tier_key con fallback al número de tier). */
function resolveTier(plan: Pick<Plan, 'tier_key' | 'tier'>): TierStyle {
  const key = (plan.tier_key || '').toLowerCase();
  if (/free|gratis|basic/.test(key)) return TIER_STYLES.free;
  if (/enterprise|empresa|corp|haras/.test(key)) return TIER_STYLES.enterprise;
  if (/premium|plus|full/.test(key)) return TIER_STYLES.premium;
  if (/pro/.test(key)) return TIER_STYLES.pro;
  const byNum: TierId[] = ['free', 'pro', 'premium', 'enterprise'];
  return TIER_STYLES[byNum[plan.tier] ?? 'free'];
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-[var(--surface-card)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-gray-400">{title}</h2>
      {children}
    </div>
  );
}

/** Pestaña con las publicaciones del usuario (relación con el muro). */
function MisPublicaciones({ userId }: { userId: string }) {
  const { data, isLoading } = useFeed({ author_id: userId });
  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--surface-card)] shadow-[var(--shadow-card)]" />
        ))}
      </div>
    );
  }
  if (!posts.length) {
    return (
      <div className="rounded-2xl bg-[var(--surface-card)] p-10 text-center shadow-[var(--shadow-card)]">
        <p className="text-sm font-semibold text-gray-700">Todavía no publicaste nada</p>
        <p className="mt-1 text-sm text-gray-400">Cuando compartas algo en el muro, va a aparecer acá.</p>
      </div>
    );
  }
  return <div className="stagger-children space-y-4">{posts.map((p) => <PostCard key={p.id} post={p} />)}</div>;
}

/** Chip de feature (para plan actual y tarjetas del catálogo).
 *  `whatsapp` muestra el logo real de la marca en vez del check genérico. */
function FeatureChip({ label, featureKey, active = true }: { label: string; featureKey?: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'bg-clay-50 text-clay-700 ring-1 ring-clay-100 dark:bg-clay-500/15 dark:text-clay-300 dark:ring-clay-500/25'
          : 'bg-gray-50 text-gray-500 ring-1 ring-gray-100'
      }`}
    >
      {featureKey === 'whatsapp' ? (
        <WhatsApp size={13} />
      ) : (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
      {label}
    </span>
  );
}

/** Extrae un mensaje de error legible de una respuesta de axios. */
function errMessage(err: unknown, fallback: string): string {
  const m = err && typeof err === 'object' && 'response' in err
    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
    : null;
  return m || fallback;
}

/** Fila de feature (listado estilo pricing). Cada feature muestra SU ícono
 *  con significado, en el color del tier; `whatsapp` usa el logo de marca. */
function FeatureRow({ label, accent, featureKey }: { label: string; accent?: string; featureKey?: string }) {
  if (featureKey === 'whatsapp') {
    return (
      <li className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
        <WhatsApp size={18} className="shrink-0" />
        {label}
      </li>
    );
  }
  const Icon = (featureKey && FEATURE_ICONS[featureKey]) || Check;
  const isCheck = Icon === Check;
  return (
    <li className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={accent ? { background: 'color-mix(in srgb, ' + accent + ' 18%, transparent)', color: accent } : undefined}
      >
        <Icon className="h-3 w-3" strokeWidth={isCheck ? 3.4 : 2.2} />
      </span>
      {label}
    </li>
  );
}

/** Chip de límite (caballos / equipo) con el acento del tier. */
function LimitChip({ label, accent }: { label: string; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: 'color-mix(in srgb, ' + accent + ' 14%, transparent)', color: accent }}
    >
      {label}
    </span>
  );
}

/** Badge de tier (Free / Pro / Premium…). */
function TierBadge({ tier }: { tier: number }) {
  const isFree = tier <= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${
        isFree
          ? 'bg-gray-50 text-gray-500 ring-gray-200'
          : 'bg-clay-50 text-clay-700 ring-clay-100 dark:bg-clay-500/15 dark:text-clay-300 dark:ring-clay-500/25'
      }`}
    >
      {tierName(tier)}
    </span>
  );
}

/** Tarjeta de un plan del catálogo — identidad visual propia por tier. */
function PlanCard({
  plan,
  current,
  onSubscribe,
}: {
  plan: Plan;
  current: boolean;
  onSubscribe: (plan: Plan) => void;
}) {
  const t = resolveTier(plan);
  // Solo se puede pagar un plan que no es el actual y que tiene precio.
  const canSubscribe = !current && plan.price_ars > 0;

  return (
    <div
      style={
        {
          '--tier-ring': t.ring,
          '--tier-glow': t.glow,
        } as React.CSSProperties
      }
      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-[var(--surface-card)] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_44px_-16px_var(--tier-glow)] ${
        current
          ? 'border-clay-500 shadow-[var(--shadow-lg)]'
          : t.featured
            ? 'border-clay-300 dark:border-clay-500/50 shadow-[var(--shadow-lg)] lg:scale-[1.03]'
            : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Badge flotante: "Tu plan" (prioridad) o "Más elegido" (Pro) */}
      {current ? (
        <span className="absolute right-4 top-4 rounded-full bg-clay-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          Tu plan
        </span>
      ) : (
        t.featured &&
        t.badge && (
          <span
            className="absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
            style={{ background: t.accent }}
          >
            {t.badge}
          </span>
        )
      )}

      {/* Nombre del plan (tipográfico, sin ícono ni círculo de color) */}
      <div className="mt-1.5 min-w-0">
        <h3 className="font-display text-lg font-extrabold leading-tight text-gray-900">{plan.name}</h3>
        <p className="text-xs font-medium text-gray-400">{t.tagline}</p>
      </div>

      {/* Precio prominente */}
      <div className="mt-5 flex items-baseline gap-1">
        {plan.price_ars > 0 ? (
          <>
            <span className="text-[1.7rem] font-extrabold leading-none tracking-tight text-gray-900 tabular-nums">
              {formatMoney(plan.price_ars)}
            </span>
            <span className="text-xs font-medium text-gray-400">/mes</span>
          </>
        ) : (
          <span className="text-[1.7rem] font-extrabold leading-none tracking-tight text-gray-900">Gratis</span>
        )}
      </div>

      {/* Límites como chips */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <LimitChip
          accent={t.accent}
          label={plan.horse_limit == null ? 'Caballos ilimitados' : `${plan.horse_limit} caballos`}
        />
        {plan.staff_limit != null && (
          <LimitChip accent={t.accent} label={plan.staff_limit === 0 ? 'Sin equipo' : `${plan.staff_limit} en equipo`} />
        )}
      </div>

      {/* Features como checklist con el check del color del tier */}
      {plan.features.length > 0 && (
        <ul className="mt-5 space-y-2.5 border-t border-gray-100 pt-5">
          {plan.features.map((f) => (
            <FeatureRow key={f} label={featureLabel(f)} accent={t.accent} featureKey={f} />
          ))}
        </ul>
      )}

      {/* CTA — anclado al fondo para tarjetas parejas */}
      <div className="mt-6 flex flex-1 items-end">
        {current ? (
          <div className="flex w-full cursor-default items-center justify-center gap-1.5 rounded-xl border border-clay-200 bg-clay-50 px-5 py-2.5 text-sm font-semibold text-clay-700 dark:border-clay-500/30 dark:bg-clay-500/10 dark:text-clay-300">
            <Check className="h-4 w-4" strokeWidth={3} /> Tu plan actual
          </div>
        ) : t.id === 'enterprise' ? (
          <a
            href={SALES_MAILTO}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c1917] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-black hover:shadow-md active:scale-95 cursor-pointer dark:bg-white dark:text-[#1c1917] dark:hover:bg-gray-100"
          >
            Contactar ventas
          </a>
        ) : canSubscribe ? (
          <button
            onClick={() => onSubscribe(plan)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c1917] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-black hover:shadow-md active:scale-95 cursor-pointer dark:bg-white dark:text-[#1c1917] dark:hover:bg-gray-100"
          >
            Suscribirme
          </button>
        ) : (
          <div className="w-full cursor-default rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-center text-sm font-semibold text-gray-400">
            Incluido
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Modal de checkout (resumen + medios de pago + pago seguro) ─── */
function CheckoutModal({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const subscribe = useSubscribe();
  const [error, setError] = useState('');

  const handlePay = async () => {
    if (!plan) return;
    setError('');
    try {
      const data = await subscribe.mutateAsync({ plan_id: plan.id });
      // Redirige el navegador a MercadoPago para autorizar el cobro.
      window.location.href = data.init_point;
    } catch (err: unknown) {
      setError(errMessage(err, 'No pudimos iniciar el pago. Probá de nuevo en unos minutos.'));
    }
  };

  const t = plan ? resolveTier(plan) : null;

  return (
    <Modal open={!!plan} onClose={onClose} title="Confirmar suscripción" size="md">
      {plan && t && (
        <div className="space-y-5">
          {/* Resumen del plan */}
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-page)] p-4">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'color-mix(in srgb, ' + t.accent + ' 14%, transparent)', color: t.accent }}
            >
              <t.Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-extrabold text-gray-900">{plan.name}</p>
              <p className="text-xs font-medium text-gray-400">{t.tagline}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold leading-none tracking-tight text-gray-900 tabular-nums">
                {formatMoney(plan.price_ars)}
              </div>
              <div className="text-xs font-medium text-gray-400">/mes</div>
            </div>
          </div>

          {/* Qué incluye */}
          <ul className="space-y-2">
            <FeatureRow
              accent={t.accent}
              label={plan.horse_limit == null ? 'Caballos ilimitados' : `Hasta ${plan.horse_limit} caballos`}
            />
            {plan.staff_limit != null && plan.staff_limit > 0 && (
              <FeatureRow accent={t.accent} label={`Hasta ${plan.staff_limit} en el equipo`} />
            )}
            {plan.features.slice(0, 2).map((f) => (
              <FeatureRow key={f} accent={t.accent} label={featureLabel(f)} featureKey={f} />
            ))}
          </ul>

          {/* Medios de pago aceptados */}
          <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-page)] p-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Medios de pago aceptados</p>
            <PaymentMethods />
          </div>

          {/* Nota de seguridad */}
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-300">
            <div className="mt-0.5 flex shrink-0 items-center gap-1">
              <Lock className="h-4 w-4" />
              <ShieldCheck className="h-4 w-4" />
            </div>
            <p className="text-xs font-medium leading-relaxed">
              Pago seguro procesado por MercadoPago. Tus datos de tarjeta no se guardan en HandicApp.
            </p>
          </div>

          {error && <p className="text-xs font-medium text-red-500">{error}</p>}

          {/* Acciones — secundario neutro + CTA cuero */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={subscribe.isPending}
              className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50 cursor-pointer dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              onClick={handlePay}
              disabled={subscribe.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-clay-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-clay-600 hover:shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {subscribe.isPending ? (
                <>
                  <Spinner size="sm" color="white" /> Redirigiendo…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" /> Ir al pago seguro
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Vista "Mi Plan": plan actual + catálogo del rol + CTA informativo. */
function MiPlan({ role }: { role?: string }) {
  const { data: status, isLoading: loadingStatus } = usePlanStatus();
  const { data: catalog, isLoading: loadingCatalog } = usePlanCatalog();
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  const roleTarget = roleTargetFor(role);
  const myPlans = (catalog ?? [])
    .filter((p) => p.role_target === roleTarget)
    .sort((a, b) => a.tier - b.tier);

  // Tier del plan actual (para el badge), derivado del catálogo.
  const currentTier = myPlans.find((p) => p.tier_key === status?.plan)?.tier;

  const usagePct = status && status.horse_limit
    ? Math.min(100, Math.round((status.horse_count / status.horse_limit) * 100))
    : 0;

  const expires = status?.plan_expires_at
    ? new Date(status.plan_expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="space-y-5">
      {/* Plan actual */}
      <SectionCard title="Plan actual">
        {loadingStatus || !status ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-clay-400 to-clay-600 text-white shadow-sm">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.664 1.319a.75.75 0 0 1 .672 0 41.06 41.06 0 0 1 8.198 5.424.75.75 0 0 1-.254 1.285 31.372 31.372 0 0 0-7.86 3.83.75.75 0 0 1-.84 0 31.508 31.508 0 0 0-2.08-1.287V9.394a.75.75 0 0 0-.293-.593 41.103 41.103 0 0 0-1.668-1.288.75.75 0 0 1 .619-1.318 41.7 41.7 0 0 1 3.328 1.81Z" /></svg>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-extrabold text-gray-900">{status.label}</p>
                    {currentTier != null && <TierBadge tier={currentTier} />}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {status.price_ars > 0 ? fmtPrice(status.price_ars) : 'Plan gratuito'}
                    {expires && ` · vence el ${expires}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Uso de caballos */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">Caballos</span>
                <span className="text-gray-500">
                  {status.horse_count}
                  {status.horse_limit == null ? ' · ilimitado' : ` / ${status.horse_limit}`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all ${status.is_limited ? 'bg-red-500' : 'bg-clay-500'}`}
                  style={{ width: status.horse_limit == null ? '100%' : `${usagePct}%` }}
                />
              </div>
              {status.is_limited && (
                <p className="mt-1.5 text-xs font-medium text-red-500">Alcanzaste el límite de caballos de tu plan.</p>
              )}
            </div>

            {/* Features activas */}
            <div>
              <p className="mb-2 text-sm font-semibold text-gray-700">Funciones incluidas</p>
              {status.features.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {status.features.map((f) => (
                    <FeatureChip key={f} label={featureLabel(f)} featureKey={f} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Tu plan actual no incluye funciones adicionales.</p>
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Catálogo del rol */}
      <SectionCard title="Planes disponibles">
        {loadingCatalog ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-100" />)}
          </div>
        ) : myPlans.length === 0 ? (
          <p className="text-sm text-gray-400">No hay planes disponibles para tu rol por ahora.</p>
        ) : (
          <>
            <div
              className={`grid gap-4 sm:grid-cols-2 ${
                myPlans.length >= 4 ? 'xl:grid-cols-4' : myPlans.length === 3 ? 'xl:grid-cols-3' : ''
              } items-stretch`}
            >
              {myPlans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  current={status?.plan === p.tier_key}
                  onSubscribe={setCheckoutPlan}
                />
              ))}
            </div>

            {/* Sello de confianza — medios de pago */}
            <div className="mt-6 flex flex-col items-center gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-center">
              <PaymentMethods />
              <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Lock className="h-3.5 w-3.5" />
                Pagá con tarjeta de crédito/débito vía MercadoPago
              </p>
            </div>
          </>
        )}
      </SectionCard>

      {/* Checkout / confirmación de suscripción */}
      <CheckoutModal plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 transition focus:border-clay-500 focus:bg-[var(--surface-card)] focus:outline-none focus:ring-2 focus:ring-clay-500/12 sm:max-w-sm';

function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative sm:max-w-sm">
      <input {...props} type={show ? 'text' : 'password'} className={inputCls + ' pr-10'} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition cursor-pointer"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

type AlertType = 'success' | 'error';
function Alert({ type, message }: { type: AlertType; message: string }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
      type === 'success'
        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
        : 'border-red-100 bg-red-50 text-red-600 dark:text-red-300'
    }`}>
      {type === 'success' ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      )}
      {message}
    </div>
  );
}

/* ─── Matrícula profesional (solo veterinarios) ─── */

type LicenseDot = 'gray' | 'amber' | 'emerald' | 'red';
const LICENSE_BADGE: Record<string, { label: string; cls: string; dot: LicenseDot }> = {
  none:     { label: 'Sin cargar', dot: 'gray',    cls: 'bg-gray-100 text-gray-500 ring-gray-200' },
  pending:  { label: 'Pendiente',  dot: 'amber',   cls: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25' },
  approved: { label: 'Aprobada',   dot: 'emerald', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25' },
  rejected: { label: 'Rechazada',  dot: 'red',     cls: 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/25' },
};

const DOT_CLS: Record<LicenseDot, string> = {
  gray: 'bg-gray-400', amber: 'bg-amber-500', emerald: 'bg-emerald-500', red: 'bg-red-500',
};

/** Badge de estado con punto de color + ícono de check para aprobada. */
function LicenseBadge({ status }: { status: string }) {
  const badge = LICENSE_BADGE[status] ?? LICENSE_BADGE.none;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${badge.cls}`}>
      {status === 'approved' ? (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLS[badge.dot]}`} />
      )}
      {badge.label}
    </span>
  );
}

function VetLicenseSection() {
  const { user, refreshUser } = useAuth();
  const status = user?.vet_license_status ?? 'none';

  const [number, setNumber] = useState(user?.vet_license_number || '');
  const [province, setProvince] = useState(user?.vet_province || '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (!number.trim() || !province.trim()) {
      setError('Ingresá el número de matrícula y la provincia.');
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.append('number', number.trim());
      form.append('province', province.trim());
      if (file) form.append('file', file);
      await api.post('/auth/vet-license', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setMsg('Matrícula enviada. Un administrador la va a validar.');
    } catch (err: unknown) {
      const m = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message : null;
      setError(m || 'No se pudo enviar la matrícula');
    } finally { setSaving(false); }
  };

  return (
    <SectionCard title="Matrícula profesional">
      <div className="space-y-4">
        {/* Cabecera de estado */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-500/15 text-clay-600 dark:text-clay-300">
              <Star className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Estado de tu matrícula</p>
              <p className="text-xs text-gray-400">Se valida manualmente por un administrador.</p>
            </div>
          </div>
          <LicenseBadge status={status} />
        </div>
        {status === 'rejected' && (
          <Alert type="error" message="Tu matrícula fue rechazada. Revisá los datos y volvé a enviarla." />
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Número de matrícula">
              <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className={inputCls + ' sm:max-w-none'} placeholder="Ej. 12345" />
            </Field>
            <Field label="Provincia">
              <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls + ' sm:max-w-none'} placeholder="Ej. Buenos Aires" />
            </Field>
          </div>
          <Field label="Foto de la matrícula" hint="Subí una foto o escaneo del carnet (opcional si ya la cargaste).">
            {user?.vet_license_url && !file && (
              <a
                href={user.vet_license_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group mb-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-[var(--surface-card)] p-2 transition hover:border-clay-200 dark:border-gray-700 sm:max-w-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.vet_license_url} alt="Matrícula cargada" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-black/5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Foto cargada</p>
                  <p className="text-xs text-clay-700 group-hover:underline dark:text-clay-300">Ver en tamaño completo</p>
                </div>
              </a>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-clay-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-clay-700 dark:file:text-clay-300 hover:file:bg-clay-100 sm:max-w-sm"
            />
          </Field>
          {msg && <Alert type="success" message={msg} />}
          {error && <Alert type="error" message={error} />}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-clay-600 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <><Spinner size="sm" color="white" /> Enviando...</> : 'Enviar para validación'}
          </button>
        </form>
      </div>
    </SectionCard>
  );
}

/* ─── Contacto / WhatsApp ─── */

function ContactSection() {
  const { user, refreshUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone || '');
  const [optIn, setOptIn] = useState(!!user?.whatsapp_opt_in);
  const [savingPhone, setSavingPhone] = useState(false);
  const [togglingOptIn, setTogglingOptIn] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setError(''); setSavingPhone(true);
    try {
      await api.patch('/auth/profile', { phone: phone.trim() || null });
      await refreshUser();
      setMsg('Teléfono actualizado correctamente');
    } catch (err: unknown) {
      setError(errMessage(err, 'No se pudo actualizar el teléfono'));
    } finally { setSavingPhone(false); }
  };

  const handleToggle = async () => {
    const next = !optIn;
    setOptIn(next);
    setMsg(''); setError(''); setTogglingOptIn(true);
    try {
      await api.patch('/auth/profile', { whatsapp_opt_in: next });
      await refreshUser();
    } catch (err: unknown) {
      setOptIn(!next); // revertir en caso de error
      setError(errMessage(err, 'No se pudo actualizar la preferencia'));
    } finally { setTogglingOptIn(false); }
  };

  return (
    <SectionCard title="Contacto / WhatsApp">
      <div className="space-y-5">
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <Field label="Teléfono" hint="Formato internacional, con código de país.">
            <div className="relative sm:max-w-sm">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                </svg>
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls + ' w-full pl-10 sm:max-w-none'}
                placeholder="+54 9 11 ..."
              />
            </div>
          </Field>
          {msg && <Alert type="success" message={msg} />}
          {error && <Alert type="error" message={error} />}
          <button
            type="submit"
            disabled={savingPhone}
            className="flex items-center gap-2 rounded-xl bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-clay-600 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {savingPhone ? <><Spinner size="sm" color="white" /> Guardando...</> : 'Guardar teléfono'}
          </button>
        </form>

        <div className="border-t border-gray-100 pt-5">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15">
                <WhatsApp size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Recibir recordatorios por WhatsApp</p>
                <p className="mt-0.5 text-xs text-gray-400">Disponible según tu plan.</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={optIn}
              onClick={handleToggle}
              disabled={togglingOptIn}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 cursor-pointer ${
                optIn ? 'bg-clay-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  optIn ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function PerfilPage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [tab, setTab] = useState<'posts' | 'plan' | 'config'>('posts');

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);

  // Color de avatar elegido por el usuario (null = automático por nombre).
  const [savingColor, setSavingColor] = useState<string | null>(null);
  const handleColorSelect = async (colorId: string | null) => {
    if ((user?.avatar_color ?? null) === colorId) return;
    setSavingColor(colorId ?? 'auto');
    try {
      await api.patch('/auth/profile', { avatar_color: colorId });
      await refreshUser();
    } catch {
      /* noop */
    } finally {
      setSavingColor(null);
    }
  };

  const handleImageUpload = async (kind: 'avatar' | 'cover', file?: File) => {
    if (!file) return;
    setUploading(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/auth/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
    } catch {
      /* noop */
    } finally {
      setUploading(null);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(''); setProfileError(''); setSavingProfile(true);
    try {
      await api.patch('/auth/profile', { name, email });
      await refreshUser();
      setProfileMsg('Datos actualizados correctamente');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message : null;
      setProfileError(msg || 'Error al actualizar');
    } finally { setSavingProfile(false); }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(''); setPasswordError('');
    if (newPassword !== confirmPassword) { setPasswordError('Las contraseñas nuevas no coinciden'); return; }
    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordMsg('Contraseña actualizada correctamente');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message : null;
      setPasswordError(msg || 'Error al cambiar contraseña');
    } finally { setSavingPassword(false); }
  };

  const initials = initialsOf(user?.name);

  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : null;
  const plan = (user as { plan?: string } | null)?.plan;

  return (
    <div className="space-y-5">

      <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload('avatar', e.target.files?.[0])} />
      <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload('cover', e.target.files?.[0])} />

      {/* Hero + pestañas — lectura legible, ancho content (no estirado a 1600) */}
      <Container width="content" className="space-y-5">
      {/* Hero del perfil */}
      <div className="overflow-hidden rounded-2xl bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
        {/* Banner / portada */}
        <div className="relative h-40" style={{ backgroundImage: avatarGradient(user?.name, user?.avatar_color) }}>
          {user?.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <button
            onClick={() => coverInput.current?.click()}
            disabled={uploading === 'cover'}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/35 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/55 disabled:opacity-60 cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" />
            {uploading === 'cover' ? 'Subiendo…' : 'Portada'}
          </button>
        </div>
        <div className="px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            {/* Avatar editable */}
            <div className="relative shrink-0">
              <Avatar
                name={user?.name}
                avatarUrl={user?.avatar_url}
                avatarColor={user?.avatar_color}
                size="xl"
                shape="rounded"
                ring
                className="h-20 w-20 text-2xl"
              />
              <button
                onClick={() => avatarInput.current?.click()}
                disabled={uploading === 'avatar'}
                aria-label="Cambiar foto"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-clay-600 text-white ring-2 ring-[var(--surface-card)] transition hover:bg-clay-700 disabled:opacity-60 cursor-pointer"
              >
                {uploading === 'avatar' ? <Spinner size="sm" color="white" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
            </div>
            {user?.role && <span className="mb-1"><RoleBadge role={user.role} /></span>}
          </div>
          <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-gray-900">
            {user?.name}
            {isVetVerified(user) && <VetVerifiedBadge size="md" />}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-gray-400" />
              {user?.email}
            </span>
            {plan && (
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-clay-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.664 1.319a.75.75 0 0 1 .672 0 41.06 41.06 0 0 1 8.198 5.424.75.75 0 0 1-.254 1.285 31.372 31.372 0 0 0-7.86 3.83.75.75 0 0 1-.84 0 31.508 31.508 0 0 0-2.08-1.287V9.394a.75.75 0 0 0-.293-.593 41.103 41.103 0 0 0-1.668-1.288.75.75 0 0 1 .619-1.318 41.7 41.7 0 0 1 3.328 1.81Z" /></svg>
                Plan {PLAN_LABELS[plan] ?? plan}
              </span>
            )}
            {memberSince && <span>Miembro desde {memberSince}</span>}
          </div>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-6 border-b border-gray-200">
        {([['posts', 'Publicaciones'], ['plan', 'Mi Plan'], ['config', 'Configuración']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative -mb-px pb-3 text-sm font-semibold transition-colors cursor-pointer ${
              tab === key ? 'text-clay-700 dark:text-clay-300' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
            {tab === key && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-clay-500" />}
          </button>
        ))}
      </div>
      </Container>

      {/* Contenido — fade al cambiar de pestaña (key fuerza el re-montaje) */}
      <div key={tab} className="animate-fade-in">
      {tab === 'posts' ? (
        <Container width="content">{user && <MisPublicaciones userId={user.id} />}</Container>
      ) : tab === 'plan' ? (
        // Pricing: aprovecha el ancho para el grid de planes (grid intacto).
        <Container width="wide"><MiPlan role={user?.role} /></Container>
      ) : (
        <Container width="content"><div className="space-y-5">
          {/* Datos personales */}
          <SectionCard title="Datos personales">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <Field label="Nombre completo">
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Correo electrónico" hint="Cambiar el email requiere verificación.">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>
              {profileMsg && <Alert type="success" message={profileMsg} />}
              {profileError && <Alert type="error" message={profileError} />}
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-xl bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-clay-600 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? <><Spinner size="sm" color="white" /> Guardando...</> : 'Guardar cambios'}
              </button>
            </form>
          </SectionCard>

          {/* Contacto / WhatsApp */}
          <ContactSection />

          {/* Matrícula profesional (solo veterinarios) */}
          {user?.role === 'veterinario' && <VetLicenseSection />}

          {/* Color de avatar */}
          <SectionCard title="Color de avatar">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {/* Preview */}
              <div className="flex shrink-0 items-center gap-3">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-extrabold text-white shadow-sm ring-1 ring-black/5"
                  style={{ backgroundImage: avatarGradient(user?.name, user?.avatar_color) }}
                >
                  {initials}
                </div>
                <div className="sm:hidden">
                  <p className="text-sm font-semibold text-gray-700">Tu avatar</p>
                  <p className="text-xs text-gray-400">Elegí un tono o dejalo automático.</p>
                </div>
              </div>

              {/* Swatches */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Automático */}
                  <button
                    type="button"
                    onClick={() => handleColorSelect(null)}
                    disabled={savingColor !== null}
                    aria-label="Color automático"
                    aria-pressed={!user?.avatar_color}
                    title="Automático"
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition hover:bg-gray-200 disabled:opacity-60 cursor-pointer ${
                      !user?.avatar_color ? 'ring-2 ring-clay-500 ring-offset-2 ring-offset-[var(--surface-card)]' : ''
                    }`}
                  >
                    {savingColor === 'auto' ? (
                      <Spinner size="sm" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                    )}
                  </button>

                  {AVATAR_PALETTE.map((p) => {
                    const selected = user?.avatar_color === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleColorSelect(p.id)}
                        disabled={savingColor !== null}
                        aria-label={`Color ${p.id}`}
                        aria-pressed={selected}
                        title={p.id}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition hover:scale-105 disabled:opacity-60 cursor-pointer ${
                          selected ? 'ring-2 ring-clay-500 ring-offset-2 ring-offset-[var(--surface-card)]' : ''
                        }`}
                        style={{ backgroundImage: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                      >
                        {savingColor === p.id ? (
                          <Spinner size="sm" color="white" />
                        ) : selected ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  Se aplica a tus iniciales cuando no tenés foto. &quot;Automático&quot; usa un tono según tu nombre.
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Seguridad */}
          <SectionCard title="Seguridad">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Field label="Contraseña actual">
                <PasswordInput required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Nueva contraseña" hint="Mínimo 6 caracteres.">
                <PasswordInput required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Confirmar nueva contraseña">
                <PasswordInput required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              {passwordMsg && <Alert type="success" message={passwordMsg} />}
              {passwordError && <Alert type="error" message={passwordError} />}
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 rounded-xl bg-clay-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-clay-600 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {savingPassword ? <><Spinner size="sm" color="white" /> Cambiando...</> : 'Cambiar contraseña'}
              </button>
            </form>
          </SectionCard>
        </div></Container>
      )}
      </div>
    </div>
  );
}

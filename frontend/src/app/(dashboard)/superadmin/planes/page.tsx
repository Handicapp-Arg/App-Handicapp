'use client';

import { useMemo, useState } from 'react';
import { Lock, Infinity as InfinityIcon, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  usePlanCatalog, useUpdatePlan,
  type Plan, type PlanFeature, type PlanRoleTarget,
} from '@/hooks/use-plan';
import {
  PageHeader, Card, Badge, Button, Modal, Input, type BadgeTone,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const ROLE_ORDER: PlanRoleTarget[] = ['propietario', 'veterinario', 'establecimiento', 'haras'];

const ROLE_LABEL: Record<PlanRoleTarget, string> = {
  propietario:     'Propietario',
  veterinario:     'Veterinario',
  establecimiento: 'Establecimiento',
  haras:           'Haras',
};

const ROLE_TONE: Record<PlanRoleTarget, BadgeTone> = {
  propietario:     'info',
  veterinario:     'success',
  establecimiento: 'navy',
  haras:           'gold',
};

const ROLE_ACCENT: Record<PlanRoleTarget, string> = {
  propietario:     'bg-blue-500',
  veterinario:     'bg-emerald-500',
  establecimiento: 'bg-navy-700',
  haras:           'bg-gold-500',
};

const FEATURES: { key: PlanFeature; label: string }[] = [
  { key: 'whatsapp',       label: 'WhatsApp' },
  { key: 'libreta_digital', label: 'Libreta digital' },
  { key: 'reportes',       label: 'Reportes' },
  { key: 'reproductivo',   label: 'Módulo reproductivo' },
];

const FEATURE_LABEL: Record<string, string> = Object.fromEntries(FEATURES.map((f) => [f.key, f.label]));

// ─────────────────────────── Toggle ───────────────────────────
function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-500',
        checked ? 'bg-clay-500' : 'bg-slate-300 dark:bg-slate-600',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

// ─────────────────────────── Limit field ───────────────────────────
function LimitField({
  label, value, onChange,
}: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const unlimited = value === null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
          <Toggle
            checked={unlimited}
            onChange={(v) => onChange(v ? null : 0)}
            label={`${label} ilimitado`}
          />
          Ilimitado
        </label>
      </div>
      <Input
        type="number"
        min={0}
        disabled={unlimited}
        value={unlimited ? '' : String(value ?? '')}
        placeholder={unlimited ? '∞ Ilimitado' : '0'}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? 0 : Math.max(0, Number(raw)));
        }}
      />
    </div>
  );
}

// ─────────────────────────── Edit modal ───────────────────────────
function EditPlanModal({ plan, open, onClose }: { plan: Plan | null; open: boolean; onClose: () => void }) {
  const update = useUpdatePlan();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [horseLimit, setHorseLimit] = useState<number | null>(null);
  const [staffLimit, setStaffLimit] = useState<number | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initId, setInitId] = useState<string | null>(null);

  // Sync local state cuando cambia el plan editado.
  if (plan && plan.id !== initId) {
    setInitId(plan.id);
    setName(plan.name);
    setPrice(String(plan.price_ars));
    setHorseLimit(plan.horse_limit);
    setStaffLimit(plan.staff_limit);
    setFeatures(plan.features);
    setActive(plan.active);
    setError(null);
  }

  if (!plan) return null;

  const toggleFeature = (key: string) =>
    setFeatures((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));

  const handleSave = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        id: plan.id,
        name: name.trim(),
        price_ars: Number(price) || 0,
        horse_limit: horseLimit,
        staff_limit: staffLimit,
        features,
        active,
      });
      onClose();
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'response' in err
          ? // @ts-expect-error axios shape
            (err.response?.data?.message ?? null)
          : err instanceof Error
            ? err.message
            : null;
      setError(msg ?? 'No pudimos guardar el plan');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar plan — ${plan.name}`}
      description={`${ROLE_LABEL[plan.role_target]} · nivel ${plan.tier}`}
      size="lg"
      dismissible={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={update.isPending} disabled={!name.trim()} onClick={handleSave}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Solo lectura */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ROLE_TONE[plan.role_target]}>{ROLE_LABEL[plan.role_target]}</Badge>
          <Badge tone="neutral">{plan.tier_key}</Badge>
        </div>

        <Input
          label="Nombre del plan"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          type="number"
          min={0}
          label="Precio (ARS / mes)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <LimitField label="Límite de caballos" value={horseLimit} onChange={setHorseLimit} />
          <LimitField label="Límite de staff" value={staffLimit} onChange={setStaffLimit} />
        </div>

        {/* Features */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Funcionalidades incluidas</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const on = features.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFeature(f.key)}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
                    on
                      ? 'border-clay-500 bg-clay-50 text-clay-700 dark:text-clay-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                      on ? 'border-clay-500 bg-clay-500 text-white' : 'border-slate-300 bg-white',
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}
                  </span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Activo */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-700">Plan activo</p>
            <p className="text-xs text-slate-500">Si está apagado, no se ofrece a nuevos clientes.</p>
          </div>
          <Toggle checked={active} onChange={setActive} label="Plan activo" />
        </div>

        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────── Plan card ───────────────────────────
function PlanCard({ plan, onEdit }: { plan: Plan; onEdit: () => void }) {
  return (
    <Card className={cn('relative flex flex-col gap-3 overflow-hidden p-4 pl-5 transition hover:shadow-md', !plan.active && 'opacity-60')}>
      <span className={cn('absolute inset-y-0 left-0 w-1.5', ROLE_ACCENT[plan.role_target])} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{plan.name}</p>
            {!plan.active && <Badge tone="danger">Inactivo</Badge>}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{plan.tier_key}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={onEdit}>Editar</Button>
      </div>

      <p className="text-lg font-bold tracking-tight text-gray-900">
        {plan.price_ars > 0 ? `${formatARS(plan.price_ars)}` : 'Gratis'}
        {plan.price_ars > 0 && <span className="text-xs font-medium text-slate-400"> /mes</span>}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          Caballos:{' '}
          {plan.horse_limit === null
            ? <InfinityIcon className="h-3.5 w-3.5" aria-label="ilimitado" />
            : <strong className="text-slate-700">{plan.horse_limit}</strong>}
        </span>
        <span className="inline-flex items-center gap-1">
          Staff:{' '}
          {plan.staff_limit === null
            ? <InfinityIcon className="h-3.5 w-3.5" aria-label="ilimitado" />
            : <strong className="text-slate-700">{plan.staff_limit}</strong>}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {plan.features.length === 0 && <span className="text-xs text-slate-400">Sin extras</span>}
        {plan.features.map((f) => (
          <Badge key={f} tone="neutral">{FEATURE_LABEL[f] ?? f}</Badge>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────── Page ───────────────────────────
export default function PlanesPage() {
  const { user } = useAuth();
  const { data: plans, isLoading } = usePlanCatalog();
  const [editing, setEditing] = useState<Plan | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<PlanRoleTarget, Plan[]>();
    for (const p of plans ?? []) {
      const arr = map.get(p.role_target) ?? [];
      arr.push(p);
      map.set(p.role_target, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.tier - b.tier);
    return map;
  }, [plans]);

  if (user?.role !== 'admin') {
    return (
      <Card className="border-danger-500/30 bg-danger-50">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-500/10 text-danger-500">
            <Lock className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-danger-700">Acceso restringido</p>
            <p className="mt-1 text-sm text-danger-700/80">
              Solo el equipo de HandicApp puede gestionar los planes.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Planes"
        subtitle="Precios, límites y funcionalidades de cada plan"
      />

      {isLoading && <p className="text-sm text-slate-500">Cargando planes…</p>}

      {!isLoading && ROLE_ORDER.map((role) => {
        const rolePlans = grouped.get(role);
        if (!rolePlans || rolePlans.length === 0) return null;
        return (
          <section key={role} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone={ROLE_TONE[role]} dot>{ROLE_LABEL[role]}</Badge>
              <span className="text-xs text-slate-400">{rolePlans.length} planes</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rolePlans.map((p) => (
                <PlanCard key={p.id} plan={p} onEdit={() => setEditing(p)} />
              ))}
            </div>
          </section>
        );
      })}

      <EditPlanModal
        plan={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

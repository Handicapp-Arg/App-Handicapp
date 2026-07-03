'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Building2, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink,
  Lock, Plus, Search, ShieldCheck, ShieldQuestion, XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  useSuperAdminMetrics, useSuperAdminOrgs, useCreateOrgManually,
  useSetOrgPlan, useSetOrgStatus, useDeleteOrg, useVetLicenses, useSetLicenseStatus,
  useSenasaCheck,
  type SuperAdminOrg, type VetLicense,
} from '@/hooks/use-superadmin';
import { PLAN_LABELS, type OrgPlan } from '@/hooks/use-organizations';
import {
  PageHeader, Card, Badge, Button, Modal, Input, Select, DataTable,
  type ColumnDef, type BadgeTone,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/currency';

const PAGE_SIZE = 15;

const formatARS = (n: number) => formatMoney(n);

const PLAN_TONE: Record<OrgPlan, BadgeTone> = {
  free:       'neutral',
  basic:      'info',
  pro:        'gold',
  enterprise: 'navy',
};

const STATUS_TONE: Record<SuperAdminOrg['status'], BadgeTone> = {
  active:    'success',
  suspended: 'danger',
  trial:     'warning',
};

const STATUS_LABEL: Record<SuperAdminOrg['status'], string> = {
  active:    'Activa',
  suspended: 'Suspendida',
  trial:     'Trial',
};

// ─────────────────────────── Metric Card ───────────────────────────
function MetricCard({
  label, value, sub, tone = 'neutral',
}: { label: string; value: string; sub?: string; tone?: 'navy' | 'gold' | 'neutral' }) {
  return (
    <Card
      className={cn(
        'p-5 transition',
        tone === 'navy' && 'bg-navy-700 border-navy-700',
        tone === 'gold' && 'bg-gold-50 border-gold-500/30',
      )}
    >
      <p
        className={cn(
          'text-[11px] font-semibold uppercase tracking-widest',
          tone === 'navy' ? 'text-white/60' : tone === 'gold' ? 'text-gold-600' : 'text-slate-400',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-3xl font-bold tracking-tight leading-none',
          tone === 'navy' ? 'text-white' : tone === 'gold' ? 'text-gold-600' : 'text-gray-900',
        )}
      >
        {value}
      </p>
      {sub && (
        <p className={cn('mt-2 text-xs font-medium', tone === 'navy' ? 'text-white/70' : 'text-slate-500')}>
          {sub}
        </p>
      )}
    </Card>
  );
}

// ─────────────────────────── Create org modal ───────────────────────────
function CreateOrgModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateOrgManually();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<OrgPlan>('basic');
  const [months, setMonths] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName(''); setEmail(''); setPlan('basic'); setMonths('1'); setNotes(''); setError(null);
  };

  const handleClose = () => { onClose(); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        name,
        owner_email: email,
        plan,
        months: plan !== 'free' ? Number(months) : undefined,
        notes: notes || undefined,
      });
      handleClose();
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'response' in err
          ? // @ts-expect-error axios shape
            (err.response?.data?.message ?? null)
          : err instanceof Error
            ? err.message
            : null;
      setError(msg ?? 'No pudimos crear la organización');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Crear organización manual"
      description="Le asignás un plan de pago a un establecimiento existente."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" form="create-org-form" loading={create.isPending} disabled={!name || !email}>
            Crear
          </Button>
        </>
      }
    >
      <form id="create-org-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del establecimiento"
          placeholder="Haras Los Pinos"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          type="email"
          label="Email del dueño"
          placeholder="dueno@email.com"
          hint="El usuario debe existir en HandicApp."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value as OrgPlan)}
            options={[
              { value: 'free',       label: 'Free (3 caballos)' },
              { value: 'basic',      label: 'Stable Basic (15)' },
              { value: 'pro',        label: 'Stable Pro (50)' },
              { value: 'enterprise', label: 'Enterprise (∞)' },
            ]}
          />
          {plan !== 'free' && (
            <Select
              label="Duración"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              options={[1, 3, 6, 12, 24].map((m) => ({ value: String(m), label: `${m} meses` }))}
            />
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notas internas (opcional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-navy-700 focus:bg-[var(--surface-card)] focus:outline-none focus:ring-2 focus:ring-navy-700/10"
            placeholder="Pagó por transferencia, etc..."
          />
        </div>
        {error && (
          <p className="rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

// ─────────────────────────── Change plan modal ───────────────────────────
function ChangePlanModal({
  org, open, onClose,
}: { org: SuperAdminOrg | null; open: boolean; onClose: () => void }) {
  const set = useSetOrgPlan();
  const [plan, setPlan] = useState<OrgPlan>(org?.plan ?? 'basic');
  const [months, setMonths] = useState('1');

  if (!org) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cambiar plan"
      description={org.name}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={set.isPending}
            onClick={async () => {
              await set.mutateAsync({
                id: org.id,
                plan,
                months: plan !== 'free' ? Number(months) : undefined,
              });
              onClose();
            }}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Nuevo plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value as OrgPlan)}
          options={[
            { value: 'free',       label: 'Free' },
            { value: 'basic',      label: 'Stable Basic' },
            { value: 'pro',        label: 'Stable Pro' },
            { value: 'enterprise', label: 'Enterprise' },
          ]}
        />
        {plan !== 'free' && (
          <Select
            label="Duración"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            options={[1, 3, 6, 12, 24].map((m) => ({ value: String(m), label: `${m} meses` }))}
          />
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────── Delete confirm ───────────────────────────
function DeleteConfirmModal({
  org, open, onClose, onConfirm, loading,
}: { org: SuperAdminOrg | null; open: boolean; onClose: () => void; onConfirm: () => void; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eliminar organización"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Eliminar</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        <strong className="text-slate-900">{org?.name ?? ''}</strong> dejará de existir. Los caballos asociados quedarán liberados (sin organización). No se borran usuarios ni eventos.
      </p>
    </Modal>
  );
}

// ─────────────────────────── Pagination footer ───────────────────────────
function TableFooter({
  page, total, pageSize, onPage,
}: { page: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>
        Mostrando <strong className="text-slate-700">{from}–{to}</strong> de <strong className="text-slate-700">{total}</strong>
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <span className="tabular-nums px-2">{page} / {last}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={page >= last}
          onClick={() => onPage(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────── Matrículas pendientes ───────────────────────────
const SENASA_URL =
  'https://aps2.senasa.gov.ar/registros/faces/publico/personas/tc_veterinariospublico.jsp';

// ─────────────────────────── SENASA check modal ───────────────────────────
function SenasaCheckModal({ vet, open, onClose }: { vet: VetLicense | null; open: boolean; onClose: () => void }) {
  const { data, isFetching, isError, refetch } = useSenasaCheck(vet?.id ?? null);

  // Dispara la consulta cada vez que se abre el modal para un vet.
  useEffect(() => {
    if (open && vet) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vet?.id]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cruce con SENASA"
      description={vet ? `${vet.name}${vet.vet_province ? ` · ${vet.vet_province}` : ''}` : undefined}
      size="md"
      footer={
        <>
          <a
            href={SENASA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:underline"
          >
            Abrir buscador SENASA <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          Resultado <strong>orientativo</strong>: consulta el registro público de acreditados de SENASA por apellido y
          provincia. La decisión final de aprobar o rechazar es siempre tuya.
        </p>

        {(isFetching || (!data && !isError)) && (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-navy-700" aria-hidden />
            Consultando SENASA…
          </div>
        )}

        {!isFetching && (isError || (data && data.available === false)) && (
          <div className="flex items-start gap-3 rounded-xl border border-warning-500/30 bg-warning-50 p-4 dark:bg-warning-500/10">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-700" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-warning-700">No se pudo consultar automáticamente</p>
              <p className="mt-1 text-warning-700/80">
                {data && data.available === false ? data.hint : 'SENASA no respondió.'} Verificá manualmente con el
                buscador oficial.
              </p>
            </div>
          </div>
        )}

        {!isFetching && data && data.available === true && data.found && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-success-500/30 bg-success-50 p-4 dark:bg-success-500/10">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success-700" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold text-success-700">Figura acreditado en SENASA</p>
                <p className="mt-1 text-success-700/80">
                  {data.matches.length} coincidencia{data.matches.length === 1 ? '' : 's'} para
                  “{data.query}”{data.truncated ? ' (mostrando las primeras 10)' : ''}. Confirmá que corresponde al
                  veterinario.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                Coincidencias en el registro
              </p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.matches.map((m, i) => (
                  <li key={`${m.cuit ?? m.name}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-500/10 text-[11px] font-bold text-success-700">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{m.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {[m.cuit, m.province].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!isFetching && data && data.available === true && !data.found && (
          <div className="flex items-start gap-3 rounded-xl border border-danger-500/30 bg-danger-50 p-4 dark:bg-danger-500/10">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-700" aria-hidden />
            <div className="text-sm">
              <p className="font-semibold text-danger-700">No figura acreditado</p>
              <p className="mt-1 text-danger-700/80">
                No encontramos coincidencias para “{data.query}” en SENASA. Puede deberse a diferencias de nombre o
                provincia; verificá manualmente antes de rechazar.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function VetLicensesSection() {
  const { data: licenses, isLoading } = useVetLicenses();
  const setStatus = useSetLicenseStatus();
  const [senasaVet, setSenasaVet] = useState<VetLicense | null>(null);

  const columns: ColumnDef<VetLicense>[] = [
    {
      key: 'name',
      header: 'Veterinario',
      render: (l) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{l.name}</p>
          <p className="truncate text-xs text-slate-400">{l.email}</p>
        </div>
      ),
    },
    {
      key: 'number',
      header: 'Matrícula',
      render: (l) => <span className="text-sm text-slate-700">{l.vet_license_number || '—'}</span>,
    },
    {
      key: 'province',
      header: 'Provincia',
      hideBelow: 'sm',
      render: (l) => <span className="text-sm text-slate-500">{l.vet_province || '—'}</span>,
    },
    {
      key: 'photo',
      header: 'Foto',
      hideBelow: 'md',
      render: (l) =>
        l.vet_license_url ? (
          <a
            href={l.vet_license_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline"
          >
            Ver foto <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          <span className="text-xs text-slate-400">Sin foto</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-[1%] whitespace-nowrap',
      render: (l) => (
        <div className="flex justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSenasaVet(l)}
            iconLeft={<ShieldQuestion className="h-4 w-4" aria-hidden />}
          >
            SENASA
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={setStatus.isPending}
            onClick={() => setStatus.mutate({ userId: l.id, status: 'approved' })}
          >
            Aprobar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={setStatus.isPending}
            onClick={() => setStatus.mutate({ userId: l.id, status: 'rejected' })}
          >
            Rechazar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-navy-700" aria-hidden />
          <h2 className="text-base font-bold text-gray-900">Matrículas pendientes</h2>
        </div>
        <a
          href={SENASA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-700/20 bg-navy-700/5 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-navy-700/10"
        >
          Verificar en SENASA <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <DataTable<VetLicense>
        columns={columns}
        rows={licenses ?? []}
        rowKey={(l) => l.id}
        loading={isLoading}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-4">
            <ShieldCheck className="h-6 w-6 text-slate-300" aria-hidden />
            <span className="text-sm font-medium text-slate-500">No hay matrículas pendientes de validación</span>
          </div>
        }
      />
      <SenasaCheckModal vet={senasaVet} open={!!senasaVet} onClose={() => setSenasaVet(null)} />
    </div>
  );
}

// ─────────────────────────── Page ───────────────────────────
export default function SuperAdminPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SuperAdminOrg | null>(null);
  const [deleting, setDeleting] = useState<SuperAdminOrg | null>(null);

  const { data: metrics } = useSuperAdminMetrics();
  const { data: orgs, isLoading } = useSuperAdminOrgs({ search, plan: planFilter });
  const setStatus = useSetOrgStatus();
  const deleteOrg = useDeleteOrg();

  const pagedOrgs = useMemo(() => {
    if (!orgs) return [];
    const start = (page - 1) * PAGE_SIZE;
    return orgs.slice(start, start + PAGE_SIZE);
  }, [orgs, page]);

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
              Solo el equipo de HandicApp puede entrar a esta sección.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const columns: ColumnDef<SuperAdminOrg>[] = [
    {
      key: 'name',
      header: 'Organización',
      render: (o) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{o.name}</p>
          {o.owner && <p className="truncate text-xs text-slate-400">{o.owner.email}</p>}
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      hideBelow: 'sm',
      render: (o) => <Badge tone={PLAN_TONE[o.plan]}>{PLAN_LABELS[o.plan]}</Badge>,
    },
    {
      key: 'counts',
      header: 'Uso',
      hideBelow: 'md',
      render: (o) => (
        <span className="text-xs text-slate-500">
          {o.horse_count} caballos · {o.member_count} miembros
        </span>
      ),
    },
    {
      key: 'revenue',
      header: 'Ingreso',
      hideBelow: 'lg',
      align: 'right',
      render: (o) => {
        const expired = o.plan_expires_at && new Date(o.plan_expires_at) < new Date();
        return (
          <div className="text-right">
            {o.monthly_revenue_ars > 0 ? (
              <span className="text-xs font-semibold text-slate-700">{formatARS(o.monthly_revenue_ars)}/mes</span>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
            {expired && <p className="text-[10px] font-semibold text-danger-700">Vencido</p>}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      hideBelow: 'sm',
      render: (o) => <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-[1%] whitespace-nowrap',
      render: (o) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setEditingPlan(o)}>
            Plan
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              setStatus.mutate({ id: o.id, status: o.status === 'active' ? 'suspended' : 'active' })
            }
          >
            {o.status === 'active' ? 'Suspender' : 'Reactivar'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDeleting(o)}
            aria-label={`Eliminar ${o.name}`}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Superadmin"
        subtitle="Control total de la plataforma HandicApp"
        action={
          <Button onClick={() => setShowCreate(true)} iconLeft={<Plus className="h-4 w-4" />}>
            Crear organización
          </Button>
        }
      />

      {/* Métricas */}
      {metrics && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="MRR activo"
            value={formatARS(metrics.mrr_ars)}
            sub={`ARR estimado: ${formatARS(metrics.arr_ars)}`}
            tone="navy"
          />
          <MetricCard
            label="Organizaciones"
            value={String(metrics.total_organizations)}
            sub={`${metrics.active_organizations} activas · ${metrics.new_orgs_30d} nuevas en 30d`}
          />
          <MetricCard
            label="Caballos totales"
            value={String(metrics.total_horses)}
            sub={`Promedio ${metrics.avg_horses_per_org} por org`}
          />
          <MetricCard
            label="Distribución de planes"
            value={`${metrics.by_plan.pro ?? 0} Pro`}
            sub={`${metrics.by_plan.basic ?? 0} Basic · ${metrics.by_plan.free ?? 0} Free · ${metrics.by_plan.enterprise ?? 0} Ent.`}
            tone="gold"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o email del dueño"
            iconLeft={<Search className="h-4 w-4" aria-hidden />}
          />
        </div>
        <div className="w-40">
          <Select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            options={[
              { value: '',           label: 'Todos los planes' },
              { value: 'free',       label: 'Free' },
              { value: 'basic',      label: 'Basic' },
              { value: 'pro',        label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
        </div>
      </div>

      {/* Tabla */}
      <DataTable<SuperAdminOrg>
        columns={columns}
        rows={pagedOrgs}
        rowKey={(o) => o.id}
        loading={isLoading}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-4">
            <Building2 className="h-6 w-6 text-slate-300" aria-hidden />
            <span className="text-sm font-medium text-slate-500">
              {search || planFilter
                ? 'No encontramos organizaciones con esos filtros'
                : 'Aún no hay organizaciones creadas'}
            </span>
            {(search || planFilter) && (
              <Button size="sm" variant="ghost" onClick={() => { setSearch(''); setPlanFilter(''); }}>
                Limpiar filtros
              </Button>
            )}
          </div>
        }
        footer={
          <TableFooter
            page={page}
            total={orgs?.length ?? 0}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        }
      />

      {/* Matrículas de veterinarios pendientes */}
      <VetLicensesSection />

      <CreateOrgModal open={showCreate} onClose={() => setShowCreate(false)} />
      <ChangePlanModal
        org={editingPlan}
        open={!!editingPlan}
        onClose={() => setEditingPlan(null)}
      />
      <DeleteConfirmModal
        org={deleting}
        open={!!deleting}
        loading={deleteOrg.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteOrg.mutateAsync(deleting.id);
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import {
  useAdminUsers, useAdminStats, useAdminPlanUsers, useAdminSetPlan,
  type AdminPlanUser,
} from '@/hooks/use-admin';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useDashboard } from '@/hooks/use-dashboard';
import type { PropietarioDashboard, EstablecimientoDashboard, VeterinarioDashboard } from '@/hooks/use-dashboard';
import { SearchInput, Pagination, StatCard, UserTable } from '@/components/panel';
import { PlanBanner } from '@/components/plan-banner';
import { useBoardingRequests, useAcceptBoardingRequest, useRejectBoardingRequest } from '@/hooks/use-boarding-requests';
import { useAuditQueue, useRevokeClaim, useApproveClaim } from '@/hooks/use-horse-records';
import { useAdminAuctions, useAdminCancelAuction, useAdminPauseAuction } from '@/hooks/use-auctions';
import { useSuperAdminMetrics } from '@/hooks/use-superadmin';
import { PageLoader, SkeletonStat } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import type { Auction } from '@/types';

/* ─── tipos ─── */

type Tab = 'propietarios' | 'establecimientos' | 'planes' | 'remates' | 'fraudes';

const tabs: { key: Tab; label: string }[] = [
  { key: 'propietarios',    label: 'Propietarios' },
  { key: 'establecimientos', label: 'Establecimientos' },
  { key: 'planes',          label: 'Planes' },
  { key: 'remates',         label: 'Remates' },
  { key: 'fraudes',         label: '🚨 Fraudes' },
];

const roleForTab: Record<Tab, string | undefined> = {
  propietarios:    'propietario',
  establecimientos: 'establecimiento',
  planes:          undefined,
  remates:         undefined,
  fraudes:         undefined,
};

const typeBadge: Record<string, string> = {
  salud:          'bg-red-50 text-red-700',
  entrenamiento:  'bg-yellow-50 text-yellow-700',
  gasto:          'bg-purple-50 text-purple-700',
  nota:           'bg-gray-100 text-gray-700',
};

const typeLabel: Record<string, string> = {
  salud: 'Salud', entrenamiento: 'Entrenamiento', gasto: 'Gasto', nota: 'Nota',
};

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

/* ─── Admin KPI bar ─── */

function AdminMetrics() {
  const { data: basic } = useAdminStats();
  const { data: sa } = useSuperAdminMetrics();

  const cards = [
    {
      label: 'MRR',
      value: sa ? formatARS(sa.mrr_ars) : '—',
      sub: sa ? `ARR ${formatARS(sa.arr_ars)}` : undefined,
      accent: 'text-emerald-700',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Propietarios',
      value: basic?.propietarios ?? '—',
      sub: undefined,
      accent: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-100',
    },
    {
      label: 'Establecimientos',
      value: basic?.establecimientos ?? '—',
      sub: sa ? `${sa.total_organizations} orgs` : undefined,
      accent: 'text-indigo-700',
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Caballos',
      value: basic?.caballos ?? '—',
      sub: sa ? `~${sa.avg_horses_per_org} por org` : undefined,
      accent: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      label: 'Pro',
      value: sa ? `${sa.by_plan?.pro ?? 0}` : '—',
      sub: sa ? `${sa.by_plan?.basic ?? 0} Basic · ${sa.by_plan?.free ?? 0} Free` : undefined,
      accent: 'text-purple-700',
      bg: 'bg-purple-50 border-purple-100',
    },
    {
      label: 'Nuevas orgs (30d)',
      value: sa ? `${sa.new_orgs_30d}` : '—',
      sub: sa && sa.suspended_count > 0 ? `${sa.suspended_count} suspendidas` : undefined,
      accent: 'text-gray-700',
      bg: 'bg-white border-gray-100',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-2xl border p-3.5 shadow-sm ${c.bg}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
          <p className={`mt-1 text-xl font-extrabold leading-none ${c.accent}`}>{String(c.value)}</p>
          {c.sub && <p className="mt-1 text-[10px] text-gray-400 leading-tight">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ─── Panel Admin ─── */

function AdminPanel() {
  const isMobile = useIsMobile();
  const limit = isMobile ? 5 : 10;

  const [tab, setTab] = useState<Tab>('propietarios');
  const [search, setSearch] = useState('');
  const [userPage, setUserPage] = useState(1);

  const isUserTab = tab === 'propietarios' || tab === 'establecimientos';
  const isPlanesTab = tab === 'planes';
  const isFraudesTab = tab === 'fraudes';
  const isRematesTab = tab === 'remates';

  const { data: usersResult, isLoading: loadingUsers } = useAdminUsers({
    search: isUserTab ? search : undefined,
    role: roleForTab[tab],
    page: userPage,
    limit,
  });
  const { data: planUsers, isLoading: loadingPlans } = useAdminPlanUsers();
  const setPlan = useAdminSetPlan();

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSearch('');
    setUserPage(1);
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setUserPage(1);
  };

  const loading = isFraudesTab || isRematesTab
    ? false
    : isPlanesTab
    ? loadingPlans
    : loadingUsers;

  const filteredPlanUsers = planUsers?.filter((u) =>
    search
      ? u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-4">
      <AdminMetrics />

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/superadmin"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>
          Organizaciones
        </Link>
        <Link href="/permisos"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
          Permisos
        </Link>
        <Link href="/catalogo"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>
          Catálogo
        </Link>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`flex-1 rounded-md px-2 py-2 text-sm font-medium transition cursor-pointer whitespace-nowrap ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search (when relevant) */}
      {(isUserTab || isPlanesTab) && (
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder={isPlanesTab ? 'Buscar usuario...' : 'Buscar por nombre o correo...'}
        />
      )}

      {loading && <PageLoader />}

      {/* User tables */}
      {!loading && isUserTab && usersResult?.data && (
        <div className="space-y-3">
          <UserTable
            users={usersResult.data}
            roleLabel={tab === 'propietarios' ? 'Propietarios' : 'Establecimientos'}
            allHorses={[]}
            roleKey={roleForTab[tab] as 'propietario' | 'establecimiento'}
          />
          <Pagination
            page={usersResult.page}
            total={usersResult.total}
            limit={usersResult.limit}
            onPageChange={setUserPage}
          />
        </div>
      )}

      {!loading && isPlanesTab && (
        <PlansAdminTable
          users={filteredPlanUsers ?? []}
          onSetPlan={(userId, plan, months) => setPlan.mutate({ userId, plan, months })}
          isPending={setPlan.isPending}
        />
      )}

      {isRematesTab && <RematesAdminTab />}

      {isFraudesTab && <FraudesTab />}
    </div>
  );
}

/* ─── Remates Admin Tab ─── */

const AUCTION_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', active: 'Activo', paused: 'Pausado',
  closed: 'Cerrado', sold: 'Vendido', cancelled: 'Cancelado',
};

const AUCTION_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  draft: 'bg-gray-100 text-gray-500',
  paused: 'bg-amber-50 text-amber-700',
  closed: 'bg-blue-50 text-blue-700',
  sold: 'bg-purple-50 text-purple-700',
  cancelled: 'bg-red-50 text-red-600',
};

function RematesAdminTab() {
  const { data: auctions, isLoading } = useAdminAuctions();
  const cancel = useAdminCancelAuction();
  const pause = useAdminPauseAuction();
  const [confirmCancel, setConfirmCancel] = useState<Auction | null>(null);

  if (isLoading) return <PageLoader />;

  const active = auctions?.filter((a) => a.status === 'active') ?? [];
  const others = auctions?.filter((a) => a.status !== 'active') ?? [];
  const all = [...active, ...others];

  if (!all.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
        <p className="text-3xl mb-2">🏇</p>
        <p className="font-medium text-gray-700">Sin remates registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">
        {all.length} remate{all.length !== 1 ? 's' : ''} · {active.length} activo{active.length !== 1 ? 's' : ''}
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-50">
          {all.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${AUCTION_STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {AUCTION_STATUS_LABELS[a.status] ?? a.status}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">{a.type === 'remate' ? 'Remate' : 'Venta directa'}</span>
                </div>
                <p className="mt-0.5 truncate text-sm font-medium text-gray-900">{a.title}</p>
                <p className="text-xs text-gray-400">
                  {a.horse?.name ?? '—'} · {a.seller?.name ?? a.seller?.email ?? '—'}
                  {a.auction_end ? ` · cierra ${new Date(a.auction_end).toLocaleDateString('es-AR')}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {a.status === 'active' && (
                  <button
                    onClick={() => pause.mutate(a.id)}
                    disabled={pause.isPending}
                    className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition cursor-pointer disabled:opacity-50"
                  >
                    Pausar
                  </button>
                )}
                {!['sold', 'cancelled', 'closed'].includes(a.status) && (
                  <button
                    onClick={() => setConfirmCancel(a)}
                    className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-2">Cancelar remate</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vas a cancelar <strong>{confirmCancel.title}</strong> de {confirmCancel.seller?.name ?? '—'}. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmCancel(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await cancel.mutateAsync(confirmCancel.id);
                  setConfirmCancel(null);
                }}
                disabled={cancel.isPending}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
              >
                {cancel.isPending ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Fraudes Tab ─── */

const FRAUD_SIGNAL_LABELS: Record<string, string> = {
  velocity:              'Alta velocidad de claims',
  competing_claim:       'Claim en competencia',
  doc_reuse:             'Documento reutilizado',
  repeated_attempt:      'Intento previo rechazado',
  registration_mismatch: 'Registro no coincide',
  high_volume_claimer:   'Reclamador de alto volumen',
};

const RISK_CONFIG = {
  none:   { label: 'Sin riesgo',   cls: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400'  },
  low:    { label: 'Riesgo bajo',  cls: 'bg-blue-50 text-blue-700',    dot: 'bg-blue-400'  },
  medium: { label: 'Riesgo medio', cls: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-500' },
  high:   { label: 'Riesgo alto',  cls: 'bg-red-50 text-red-700',      dot: 'bg-red-500'   },
};

const APPROVAL_REASON_LABELS: Record<string, string> = {
  registration_number_match: 'Nº registro coincide',
  doc_plus_birthdate:        'Doc + fecha de nac.',
  doc_only:                  'Solo documento',
  birthdate_only:            'Solo fecha de nac.',
  microchip_only_pending:    'Solo microchip (pendiente)',
  no_evidence_pending:       'Sin evidencia (pendiente)',
};

function FraudesTab() {
  const { data, isLoading } = useAuditQueue(50, 0);
  const revoke = useRevokeClaim();
  const approve = useApproveClaim();
  const [revokeTarget, setRevokeTarget] = useState<{ id: string; name: string } | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const claims = data?.items ?? [];

  if (isLoading) return <PageLoader />;

  if (claims.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="font-medium text-gray-700">Sin claims para auditar</p>
        <p className="text-sm text-gray-400 mt-1">
          Todos los claims auto-aprobados tienen evidencia fuerte o ya fueron revisados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {data?.total ?? 0} claim{(data?.total ?? 0) !== 1 ? 's' : ''} requieren revisión
        </p>
        <p className="text-xs text-gray-400">
          Claims auto-aprobados con evidencia débil o con señales de fraude.
        </p>
      </div>

      {claims.map((claim) => {
        const risk = RISK_CONFIG[claim.fraud_risk ?? 'none'];
        const isOpen = expanded === claim.id;
        const signals = claim.fraud_signals ?? [];
        const approvalLabel = APPROVAL_REASON_LABELS[claim.matched_fields?.[0] ?? ''] ?? '—';

        return (
          <div key={claim.id} className={`rounded-xl border bg-white overflow-hidden ${claim.fraud_risk === 'high' ? 'border-red-200' : claim.fraud_risk === 'medium' ? 'border-amber-200' : 'border-gray-200'}`}>
            {claim.fraud_risk !== 'none' && (
              <div className={`h-1 w-full ${claim.fraud_risk === 'high' ? 'bg-red-400' : claim.fraud_risk === 'medium' ? 'bg-amber-400' : 'bg-blue-300'}`} />
            )}

            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${risk.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
                      {risk.label}
                    </span>
                    {claim.needs_audit && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 font-medium">
                        Auditoría pendiente
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {claim.status === 'auto_approved' ? 'Auto-aprobado' : claim.status === 'approved' ? 'Aprobado' : claim.status}
                    </span>
                  </div>

                  <p className="mt-1.5 font-semibold text-gray-900 text-sm truncate">
                    {claim.horse_record?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {claim.claimant?.name ?? 'Usuario'} · {claim.claimant?.email ?? ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(claim.created_at).toLocaleString('es-AR')} · Evidencia: {approvalLabel} · Score: {claim.match_score ?? 0}/100
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : claim.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                  >
                    {isOpen ? 'Ocultar' : 'Detalle'}
                  </button>
                  {(claim.status === 'auto_approved' || claim.status === 'approved') && (
                    <button
                      onClick={() => { setRevokeTarget({ id: claim.id, name: claim.horse_record?.name ?? '' }); setRevokeReason(''); }}
                      className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition cursor-pointer"
                    >
                      Revocar
                    </button>
                  )}
                  {claim.status === 'pending' && (
                    <button
                      onClick={() => approve.mutate(claim.id)}
                      disabled={approve.isPending}
                      className="text-xs font-medium text-green-700 hover:text-green-800 px-2 py-1 rounded border border-green-200 hover:bg-green-50 transition cursor-pointer disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  )}
                </div>
              </div>

              {signals.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {signals.map((s) => (
                    <span key={s.key} title={s.detail}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium cursor-help ${
                        s.weight >= 3 ? 'bg-red-50 text-red-700' : s.weight === 2 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                      {s.weight >= 3 ? '⚠️' : s.weight === 2 ? '⚡' : 'ℹ️'}
                      {FRAUD_SIGNAL_LABELS[s.key] ?? s.key}
                    </span>
                  ))}
                </div>
              )}

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                  {signals.map((s) => (
                    <div key={s.key} className="flex items-start gap-2">
                      <span className={`shrink-0 font-medium ${s.weight >= 3 ? 'text-red-600' : s.weight === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {FRAUD_SIGNAL_LABELS[s.key] ?? s.key}:
                      </span>
                      <span className="text-gray-500">{s.detail}</span>
                    </div>
                  ))}
                  {claim.document_url && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-gray-400">Documento:</span>
                      <a href={claim.document_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate max-w-xs">
                        Ver archivo adjunto ↗
                      </a>
                    </div>
                  )}
                  {claim.registration_number && (
                    <p><span className="text-gray-400">Registro declarado:</span> {claim.registration_number}</p>
                  )}
                  {claim.claimed_birth_date && (
                    <p><span className="text-gray-400">Fecha declarada:</span> {new Date(claim.claimed_birth_date + 'T12:00:00').toLocaleDateString('es-AR')}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Revocar claim</h3>
            <p className="text-sm text-gray-500 mb-4">
              Vas a revocar la propiedad de <strong>{revokeTarget.name}</strong>.
              El caballo será eliminado de la cuenta del usuario y el registro quedará disponible para nuevas solicitudes.
            </p>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Motivo de la revocación (requerido)..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-2 mt-4">
              <button onClick={() => setRevokeTarget(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!revokeReason.trim()) return;
                  await revoke.mutateAsync({ claimId: revokeTarget.id, reason: revokeReason });
                  setRevokeTarget(null);
                }}
                disabled={!revokeReason.trim() || revoke.isPending}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
              >
                {revoke.isPending ? 'Revocando...' : 'Confirmar revocación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Plans Admin Table ─── */

function PlansAdminTable({
  users,
  onSetPlan,
  isPending,
}: {
  users: AdminPlanUser[];
  onSetPlan: (userId: string, plan: 'free' | 'pro', months?: number) => void;
  isPending: boolean;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [months, setMonths] = useState<Record<string, number>>({});

  if (!users.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
        <p className="text-sm text-gray-400">No hay usuarios para gestionar</p>
      </div>
    );
  }

  const ROLE_LABELS: Record<string, string> = {
    propietario: 'Propietario', establecimiento: 'Establecimiento',
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="hidden sm:grid grid-cols-[1fr_1fr_90px_100px_180px] gap-0 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Usuario</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Rol</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Plan actual</span>
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Acción</span>
      </div>

      <div className="divide-y divide-gray-50">
        {users.map((u) => {
          const isPro = u.plan === 'pro';
          const expiresStr = u.plan_expires_at
            ? new Date(u.plan_expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
            : null;
          const m = months[u.id] ?? 1;

          return (
            <div key={u.id}>
              <div className="hidden sm:grid grid-cols-[1fr_1fr_90px_100px_180px] items-center px-4 py-3">
                <div className="min-w-0 pr-2">
                  <p className="font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.horse_count} caballos</p>
                </div>
                <span className="text-sm text-gray-600 truncate pr-2">{u.email}</span>
                <span className="text-xs text-gray-500">{ROLE_LABELS[u.role] ?? u.role}</span>
                <div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isPro ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isPro ? '⭐ Pro' : 'Gratis'}
                  </span>
                  {isPro && expiresStr && <p className="text-[10px] text-gray-400 mt-0.5">vence {expiresStr}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  {!isPro ? (
                    <>
                      <select
                        value={m}
                        onChange={(e) => setMonths((prev) => ({ ...prev, [u.id]: Number(e.target.value) }))}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none"
                      >
                        {[1, 3, 6, 12].map((mo) => (
                          <option key={mo} value={mo}>{mo} {mo === 1 ? 'mes' : 'meses'}</option>
                        ))}
                      </select>
                      <button
                        disabled={isPending && pendingId === u.id}
                        onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'pro', m); }}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition cursor-pointer disabled:opacity-50"
                      >
                        {isPending && pendingId === u.id ? '...' : 'Activar Pro'}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={isPending && pendingId === u.id}
                      onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'free'); }}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {isPending && pendingId === u.id ? '...' : 'Revocar Pro'}
                    </button>
                  )}
                </div>
              </div>

              <div className="sm:hidden p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABELS[u.role]} · {u.horse_count} caballos</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isPro ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isPro ? '⭐ Pro' : 'Gratis'}
                  </span>
                </div>
                {isPro && expiresStr && <p className="text-xs text-gray-400">Vence: {expiresStr}</p>}
                <div className="flex items-center gap-2">
                  {!isPro ? (
                    <>
                      <select
                        value={m}
                        onChange={(e) => setMonths((prev) => ({ ...prev, [u.id]: Number(e.target.value) }))}
                        className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none"
                      >
                        {[1, 3, 6, 12].map((mo) => (
                          <option key={mo} value={mo}>{mo} {mo === 1 ? 'mes' : 'meses'}</option>
                        ))}
                      </select>
                      <button
                        disabled={isPending && pendingId === u.id}
                        onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'pro', m); }}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition cursor-pointer disabled:opacity-50"
                      >
                        {isPending && pendingId === u.id ? '...' : 'Activar Pro'}
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={isPending && pendingId === u.id}
                      onClick={() => { setPendingId(u.id); onSetPlan(u.id, 'free'); }}
                      className="w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    >
                      {isPending && pendingId === u.id ? '...' : 'Revocar Pro'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Dashboard Propietario ─── */

function PropietarioDashboardView({ data }: { data: PropietarioDashboard }) {
  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Mis caballos</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.horses.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Gasto en {monthName}</p>
          <p className="mt-1 text-2xl font-bold text-purple-700">${data.monthly_spend.toLocaleString('es-AR')}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Eventos recientes</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.recent_events.length}</p>
        </div>
      </div>

      {data.horses.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Mis caballos</h2>
            <Link href="/caballos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.horses.slice(0, 5).map((h) => (
              <Link key={h.id} href={`/caballos/${h.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {h.image_url
                    ? <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{h.name}</p>
                  {h.establishment && <p className="text-xs text-gray-400 truncate">{h.establishment.name}</p>}
                </div>
                <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.recent_events.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
            <Link href="/eventos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${typeBadge[ev.type] ?? typeBadge.nota}`}>
                  {typeLabel[ev.type] ?? ev.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{ev.description}</p>
                  {ev.horse && <p className="text-xs text-gray-400">{ev.horse.name}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Establecimiento ─── */

function BoardingRequestsPanel() {
  const { data: requests } = useBoardingRequests();
  const accept = useAcceptBoardingRequest();
  const reject = useRejectBoardingRequest();

  const pending = requests?.filter((r) => r.status === 'pending') ?? [];
  if (!pending.length) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-100">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </span>
        <h2 className="text-sm font-semibold text-amber-900">
          Solicitudes de alojamiento
          <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-800">{pending.length}</span>
        </h2>
      </div>
      <div className="divide-y divide-amber-100">
        {pending.map((req) => (
          <div key={req.id} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {req.requester?.name} solicita alojar a <span className="text-[#0f1f3d]">{req.horse?.name}</span>
              </p>
              {req.message && <p className="mt-0.5 text-xs text-gray-500 italic">"{req.message}"</p>}
              <p className="mt-0.5 text-xs text-gray-400">
                {new Date(req.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => reject.mutate(req.id)}
                disabled={reject.isPending || accept.isPending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-50"
              >
                Rechazar
              </button>
              <button
                onClick={() => accept.mutate(req.id)}
                disabled={accept.isPending || reject.isPending}
                className="rounded-lg bg-[#0f1f3d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a1628] transition cursor-pointer disabled:opacity-50"
              >
                {accept.isPending ? '...' : 'Aceptar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EstablecimientoDashboardView({ data }: { data: EstablecimientoDashboard }) {
  const now = new Date();
  const monthName = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <BoardingRequestsPanel />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Caballos en pensión</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.horses.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Eventos en {monthName}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.monthly_events_count}</p>
        </div>
      </div>

      {data.horses.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Caballos en pensión</h2>
            <Link href="/caballos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.horses.slice(0, 8).map((h) => (
              <Link key={h.id} href={`/caballos/${h.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {h.image_url
                    ? <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" />
                    : <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{h.name}</p>
                  {h.owner && <p className="text-xs text-gray-400 truncate">Prop. {h.owner.name}</p>}
                </div>
                <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {data.recent_events.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
            <Link href="/eventos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${typeBadge[ev.type] ?? typeBadge.nota}`}>
                  {typeLabel[ev.type] ?? ev.type}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-700">{ev.description}</p>
                  {ev.horse && <p className="text-xs text-gray-400">{ev.horse.name}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Dashboard Veterinario ─── */

function VeterinarioDashboardView({ data }: { data: VeterinarioDashboard }) {
  const MED_LABEL: Record<string, string> = {
    vacuna: 'Vacuna', desparasitacion: 'Desparasitación', analisis: 'Análisis', tratamiento: 'Tratamiento',
  };

  if (data.horses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
        <p className="text-3xl mb-3">💉</p>
        <p className="text-sm font-semibold text-gray-600">Sin caballos asignados</p>
        <p className="mt-1 text-xs text-gray-400">Un propietario o establecimiento debe asignarte como veterinario desde el detalle del caballo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mis pacientes</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{data.total_horses}</p>
        </div>
        <div className="rounded-2xl border border-red-50 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Eventos salud</p>
          <p className="mt-1 text-3xl font-bold text-red-700">{data.total_salud_events}</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${data.upcoming_medical.length > 0 ? 'border-amber-100 bg-amber-50' : 'border-gray-100 bg-white'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${data.upcoming_medical.length > 0 ? 'text-amber-500' : 'text-gray-400'}`}>Vencen pronto</p>
          <p className={`mt-1 text-3xl font-bold ${data.upcoming_medical.length > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{data.upcoming_medical.length}</p>
        </div>
      </div>

      {data.upcoming_medical.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-amber-100">
            <h2 className="text-sm font-semibold text-amber-800">⏰ Próximos vencimientos (30 días)</h2>
          </div>
          <div className="divide-y divide-amber-100">
            {data.upcoming_medical.map((m) => {
              const dueDate = new Date(m.next_due + 'T12:00:00');
              const daysUntil = Math.round((dueDate.getTime() - new Date().setHours(0,0,0,0)) / 86_400_000);
              const horse = data.horses.find((h) => h.id === m.horse_id);
              return (
                <Link key={m.id} href={`/caballos/${m.horse_id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-amber-100/50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-amber-700 bg-white/70 rounded-full px-2 py-0.5">
                        {MED_LABEL[m.type] ?? m.type}
                      </span>
                      <span className="text-sm font-medium text-amber-900">{m.name}</span>
                    </div>
                    {horse && <p className="text-xs text-amber-600 mt-0.5">{horse.name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-amber-700">
                      {daysUntil === 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `en ${daysUntil}d`}
                    </p>
                    <p className="text-[10px] text-amber-500">
                      {dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Mis pacientes</h2>
          <Link href="/caballos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {data.horses.map((h) => (
            <Link key={h.id} href={`/caballos/${h.id}`}
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition"
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {h.image_url
                  ? <img src={h.image_url} alt={h.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">{h.name[0]}</div>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{h.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {h.breed && <span className="text-[10px] text-gray-400">{h.breed.name}</span>}
                  {h.owner && <span className="text-[10px] text-gray-400">· {h.owner.name}</span>}
                </div>
              </div>
              <svg className="h-4 w-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {data.recent_health_events.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Últimos registros de salud</h2>
            <Link href="/eventos" className="text-xs font-medium text-[#0f1f3d] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recent_health_events.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Salud</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 line-clamp-1">{ev.description}</p>
                  {(ev as any).horse && <p className="text-xs text-gray-400">{(ev as any).horse.name}</p>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─── */

export default function PanelPage() {
  const { user } = useAuth();
  const { data: dashboard, isLoading, isError, refetch } = useDashboard();

  const isAdmin = user?.role === 'admin';
  const title = isAdmin ? 'Panel' : 'Inicio';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-[1.375rem] font-extrabold tracking-tight text-gray-900">{title}</h1>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[1,2,3,4,5,6].map(i => <SkeletonStat key={i} />)}
        </div>
        <PageLoader />
      </div>
    );
  }

  if (isError && !isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-[1.375rem] font-extrabold tracking-tight text-gray-900">{title}</h1>
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[1.375rem] font-extrabold tracking-tight text-gray-900">{title}</h1>

      <PlanBanner />

      {isAdmin && <AdminPanel />}

      {dashboard?.role === 'propietario' && (
        <PropietarioDashboardView data={dashboard} />
      )}

      {dashboard?.role === 'establecimiento' && (
        <EstablecimientoDashboardView data={dashboard} />
      )}

      {dashboard?.role === 'veterinario' && (
        <VeterinarioDashboardView data={dashboard} />
      )}
    </div>
  );
}

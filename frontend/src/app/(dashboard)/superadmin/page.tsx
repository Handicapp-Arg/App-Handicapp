'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  useSuperAdminMetrics, useSuperAdminOrgs, useCreateOrgManually,
  useSetOrgPlan, useSetOrgStatus, useDeleteOrg, type SuperAdminOrg,
} from '@/hooks/use-superadmin';
import { PageHeader } from '@/components/ui/page-header';
import { PLAN_LABELS, type OrgPlan } from '@/hooks/use-organizations';

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

function MetricCard({
  label, value, sub, accent,
}: { label: string; value: string; sub?: string; accent?: 'navy' | 'gold' | 'amber' | 'gray' }) {
  const styles = {
    navy:  { bg: '#0f1f3d', text: '#fff', label: 'rgba(255,255,255,0.5)', sub: 'rgba(255,255,255,0.6)' },
    gold:  { bg: '#fffbeb', text: '#78350f', label: '#b45309', sub: '#d97706' },
    amber: { bg: '#fff7ed', text: '#9a3412', label: '#c2410c', sub: '#ea580c' },
    gray:  { bg: '#fff', text: '#0f172a', label: '#94a3b8', sub: '#64748b' },
  };
  const s = styles[accent ?? 'gray'];
  return (
    <div className="rounded-2xl border border-gray-100 p-5 shadow-sm" style={{ backgroundColor: s.bg }}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.07em]" style={{ color: s.label }}>{label}</p>
      <p className="mt-1 text-[2rem] font-bold tracking-[-0.03em] leading-none" style={{ color: s.text }}>{value}</p>
      {sub && <p className="mt-1.5 text-xs font-medium" style={{ color: s.sub }}>{sub}</p>}
    </div>
  );
}

function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const create = useCreateOrgManually();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<OrgPlan>('basic');
  const [months, setMonths] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    try {
      await create.mutateAsync({ name, owner_email: email, plan, months: plan !== 'free' ? months : undefined, notes: notes || undefined });
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'No se pudo crear la organización');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#0f1f3d] px-6 py-4">
          <p className="font-bold text-white">Crear organización manual</p>
          <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre del establecimiento *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="Haras Los Pinos" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email del dueño *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" placeholder="dueno@email.com" />
            <p className="mt-1 text-xs text-gray-400">El usuario debe existir en HandicApp.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value as OrgPlan)} className="input-base">
                <option value="free">Free (3 caballos)</option>
                <option value="basic">Stable Basic (25)</option>
                <option value="pro">Stable Pro (80)</option>
                <option value="enterprise">Enterprise (∞)</option>
              </select>
            </div>
            {plan !== 'free' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Duración (meses)</label>
                <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="input-base">
                  {[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas internas (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-base resize-none" placeholder="Pagó por transferencia, etc..." />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 border-t border-gray-100 p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={!name || !email || create.isPending} className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-[#0a1628]">
            {create.isPending ? 'Creando...' : 'Crear organización'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePlanModal({ org, onClose }: { org: SuperAdminOrg; onClose: () => void }) {
  const set = useSetOrgPlan();
  const [plan, setPlan] = useState<OrgPlan>(org.plan);
  const [months, setMonths] = useState(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#0f1f3d] px-6 py-4">
          <p className="font-bold text-white">Cambiar plan</p>
          <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600"><span className="font-semibold">{org.name}</span></p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuevo plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value as OrgPlan)} className="input-base">
              <option value="free">Free</option>
              <option value="basic">Stable Basic</option>
              <option value="pro">Stable Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          {plan !== 'free' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Duración (meses)</label>
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="input-base">
                {[1, 3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} meses</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-gray-100 p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50">Cancelar</button>
          <button
            onClick={async () => { await set.mutateAsync({ id: org.id, plan, months: plan !== 'free' ? months : undefined }); onClose(); }}
            disabled={set.isPending}
            className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-[#0a1628]"
          >
            {set.isPending ? 'Aplicando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SuperAdminOrg | null>(null);

  const { data: metrics } = useSuperAdminMetrics();
  const { data: orgs, isLoading } = useSuperAdminOrgs({ search, plan: planFilter });
  const setStatus = useSetOrgStatus();
  const deleteOrg = useDeleteOrg();

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
        Acceso restringido. Solo el superadmin puede ver esta página.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Superadmin"
        subtitle="Control total de la plataforma HandicApp"
        action={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            + Crear organización
          </button>
        }
      />

      {/* Métricas */}
      {metrics && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="MRR Activo"
            value={formatARS(metrics.mrr_ars)}
            sub={`ARR: ${formatARS(metrics.arr_ars)}`}
            accent="navy"
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
            label="Por plan"
            value={`${metrics.by_plan.pro ?? 0} Pro`}
            sub={`${metrics.by_plan.basic ?? 0} Basic · ${metrics.by_plan.free ?? 0} Free · ${metrics.by_plan.enterprise ?? 0} Ent.`}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email del dueño..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-[#0f1f3d] focus:outline-none"
          />
        </div>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#0f1f3d] focus:outline-none">
          <option value="">Todos los planes</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Organizaciones {orgs ? <span className="text-gray-400 font-normal">({orgs.length})</span> : ''}</h2>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
          </div>
        ) : !orgs?.length ? (
          <div className="py-12 text-center text-sm text-gray-400">Sin organizaciones</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orgs.map((o) => {
              const isExpired = o.plan_expires_at && new Date(o.plan_expires_at) < new Date();
              return (
                <div key={o.id} className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition">
                  <div className="col-span-3 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.name}</p>
                    {o.owner && <p className="text-xs text-gray-400 truncate">{o.owner.email}</p>}
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      o.plan === 'free' ? 'bg-gray-100 text-gray-600'
                      : o.plan === 'basic' ? 'bg-blue-50 text-blue-700'
                      : o.plan === 'pro' ? 'bg-amber-50 text-amber-700'
                      : 'bg-purple-50 text-purple-700'
                    }`}>
                      {PLAN_LABELS[o.plan]}
                    </span>
                  </div>
                  <div className="col-span-2 text-xs text-gray-500">
                    {o.horse_count} caballos · {o.member_count} miembros
                  </div>
                  <div className="col-span-2 text-xs">
                    {o.monthly_revenue_ars > 0
                      ? <span className="font-semibold text-gray-700">{formatARS(o.monthly_revenue_ars)}/mes</span>
                      : <span className="text-gray-400">—</span>
                    }
                    {isExpired && <p className="text-red-500 font-medium">Vencido</p>}
                  </div>
                  <div className="col-span-1">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      o.status === 'active' ? 'bg-emerald-50 text-emerald-700'
                      : o.status === 'suspended' ? 'bg-red-50 text-red-700'
                      : 'bg-amber-50 text-amber-700'
                    }`}>
                      {o.status}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end gap-1.5">
                    <button onClick={() => setEditingPlan(o)} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer">
                      Plan
                    </button>
                    <button
                      onClick={() => setStatus.mutate({ id: o.id, status: o.status === 'active' ? 'suspended' : 'active' })}
                      className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                    >
                      {o.status === 'active' ? 'Suspender' : 'Reactivar'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${o.name}"? Los caballos quedarán liberados (sin organización).`)) {
                          deleteOrg.mutate(o.id);
                        }
                      }}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} />}
      {editingPlan && <ChangePlanModal org={editingPlan} onClose={() => setEditingPlan(null)} />}
    </div>
  );
}
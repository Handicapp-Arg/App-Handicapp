'use client';

import { useState } from 'react';
import {
  useMyOrganizations, useOrganization, useOrgInvitations,
  useCreateInvitation, useCancelInvitation, useRemoveMember, useChangeMemberRole,
  ROLE_LABELS, PLAN_LABELS, type OrgRole,
} from '@/hooks/use-organizations';
import { useAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/ui/page-header';
import { PageLoader } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const ROLE_OPTIONS: { value: OrgRole; label: string; desc: string }[] = [
  { value: 'staff',      label: 'Staff',          desc: 'Cuidador / personal del establecimiento — gestiona caballos y eventos' },
  { value: 'owner_role', label: 'Propietario',    desc: 'Solo ve los caballos de su propiedad' },
  { value: 'vet',        label: 'Veterinario',    desc: 'Solo ve los caballos a los que esté asignado' },
  { value: 'admin',      label: 'Administrador',  desc: 'Control total sobre la organización' },
];

function PlanCard({ plan, horseCount, horseLimit, expiresAt }: {
  plan: string; horseCount: number; horseLimit: number | null; expiresAt: string | null;
}) {
  const pct = horseLimit ? Math.min((horseCount / horseLimit) * 100, 100) : 0;
  const isPro = plan !== 'free';

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Plan</p>
          <p className="mt-1 text-2xl font-bold tracking-[-0.025em] text-gray-900">{PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan}</p>
          {expiresAt && isPro && (
            <p className="mt-1 text-xs text-gray-500">
              Vence: {new Date(expiresAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          isPro ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-gray-50 text-gray-500 ring-1 ring-gray-200'
        }`}>
          {isPro && '⭐'} {isPro ? 'Activo' : 'Free'}
        </span>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {horseCount} {horseLimit ? `/ ${horseLimit}` : ''} caballos
          </span>
          {horseLimit && pct >= 80 && (
            <span className="text-xs font-medium text-amber-600">Cerca del límite</span>
          )}
        </div>
        {horseLimit && (
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-[#0f1f3d]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {!isPro && (
        <a
          href="https://wa.me/5491100000000?text=Hola,%20quiero%20mejorar%20el%20plan%20de%20mi%20organizaci%C3%B3n%20en%20HandicApp"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white hover:bg-[#0a1628] transition cursor-pointer"
        >
          Mejorar plan
        </a>
      )}
    </div>
  );
}

function InviteModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const create = useCreateInvitation(orgId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('staff');
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    const inv = await create.mutateAsync({ email: email.trim().toLowerCase(), role_in_org: role });
    const link = `${window.location.origin}/invitacion/${inv.token}`;
    setCreatedLink(link);
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#0f1f3d] px-6 py-4">
          <p className="font-bold text-white">Invitar miembro</p>
          <button onClick={onClose} className="text-white/60 hover:text-white cursor-pointer">✕</button>
        </div>

        {!createdLink ? (
          <>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  className="input-base"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rol</label>
                <div className="space-y-1.5">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                        role === opt.value ? 'border-[#0f1f3d] bg-[#0f1f3d]/5' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={role === opt.value}
                        onChange={() => setRole(opt.value)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500 leading-snug mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 border-t border-gray-100 p-4">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!email.trim() || create.isPending}
                className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-[#0a1628] transition"
              >
                {create.isPending ? 'Generando...' : 'Generar invitación'}
              </button>
            </div>
          </>
        ) : (
          <div className="p-6 space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900">Invitación lista</p>
              <p className="mt-1 text-sm text-gray-500">Compartí este link con la persona invitada. Válido por 7 días.</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 break-all text-xs text-gray-700 font-mono">
              {createdLink}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex-1 rounded-lg bg-[#0f1f3d] py-2.5 text-sm font-semibold text-white cursor-pointer hover:bg-[#0a1628] transition">
                {copied ? '✓ Copiado' : 'Copiar link'}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Te invito a HandicApp: ${createdLink}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Enviar por WhatsApp
              </a>
            </div>
            <button onClick={onClose} className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-500 cursor-pointer hover:bg-gray-50">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrganizacionPage() {
  const { user } = useAuth();
  const { data: myOrgs, isLoading: loadingOrgs } = useMyOrganizations();
  const orgId = myOrgs?.[0]?.id ?? null;
  const { data: org, isLoading: loadingOrg } = useOrganization(orgId);
  const { data: invitations } = useOrgInvitations(orgId);
  const removeMember = useRemoveMember(orgId ?? '');
  const cancelInv = useCancelInvitation(orgId ?? '');
  const changeRole = useChangeMemberRole(orgId ?? '');
  const [showInvite, setShowInvite] = useState(false);

  if (loadingOrgs || loadingOrg) return <PageLoader />;

  if (!org) {
    return (
      <div className="space-y-6 max-w-3xl">
        <PageHeader title="Organización" />
        <EmptyState
          icon={
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
          }
          title="No pertenecés a ninguna organización"
          message="Las organizaciones permiten a los establecimientos gestionar a sus propietarios y veterinarios bajo un mismo plan. Contactanos para crear la tuya."
        />
      </div>
    );
  }

  const myMember = org.members.find((m) => m.user_id === user?.id);
  const isAdmin = myMember?.role_in_org === 'admin';
  const isOwner = org.owner_id === user?.id;
  const canInvite = isAdmin || isOwner;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={org.name}
        subtitle="Tu organización en HandicApp"
        badge={{ label: PLAN_LABELS[org.plan], color: org.plan !== 'free' ? 'amber' : undefined }}
      />

      {/* Plan */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Caballos</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{org.horse_count}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Miembros</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{org.members.length}</p>
          </div>
        </div>
        <PlanCard plan={org.plan} horseCount={org.horse_count} horseLimit={org.horse_limit} expiresAt={org.plan_expires_at} />
      </div>

      {/* Invitaciones pendientes */}
      {invitations && invitations.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Invitaciones pendientes ({invitations.length})</p>
          </div>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg bg-white p-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500">{ROLE_LABELS[inv.role_in_org]} · expira {new Date(inv.expires_at).toLocaleDateString('es-AR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invitacion/${inv.token}`)}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Copiar link
                  </button>
                  {canInvite && (
                    <button
                      onClick={() => cancelInv.mutate(inv.id)}
                      className="text-red-500 hover:text-red-700 text-lg leading-none cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Miembros */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Miembros <span className="text-gray-400 font-normal">({org.members.length})</span>
          </h2>
          {canInvite && (
            <button
              onClick={() => setShowInvite(true)}
              className="rounded-lg bg-[#0f1f3d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a1628] transition cursor-pointer"
            >
              + Invitar
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-50">
          {org.members.map((member) => {
            const isOrgOwner = member.user_id === org.owner_id;
            return (
              <div key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0f1f3d] text-sm font-bold text-white">
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {member.user.name}
                    {member.user_id === user?.id && <span className="text-[10px] text-gray-400 ml-2">(vos)</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {canInvite && !isOrgOwner ? (
                    <select
                      value={member.role_in_org}
                      onChange={(e) => changeRole.mutate({ memberId: member.id, role_in_org: e.target.value as OrgRole })}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 cursor-pointer focus:outline-none focus:border-gray-400"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      isOrgOwner ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isOrgOwner ? '👑 Dueño' : ROLE_LABELS[member.role_in_org]}
                    </span>
                  )}
                  {canInvite && !isOrgOwner && member.user_id !== user?.id && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Quitar a ${member.user.name} de la organización?`)) {
                          removeMember.mutate(member.id);
                        }
                      }}
                      className="text-gray-300 hover:text-red-500 cursor-pointer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showInvite && orgId && <InviteModal orgId={orgId} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
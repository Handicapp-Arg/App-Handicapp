'use client';

import { useState } from 'react';
import {
  Building2, CheckCircle2, Copy, MessageCircle, Plus, Sparkles, UserMinus,
} from 'lucide-react';
import {
  useMyOrganizations, useOrganization, useOrgInvitations,
  useCreateInvitation, useCancelInvitation, useRemoveMember, useChangeMemberRole,
  ROLE_LABELS, PLAN_LABELS, type OrgRole,
} from '@/hooks/use-organizations';
import { useAuth } from '@/lib/auth-context';
import {
  PageHeader, PageLoader, EmptyState, Card, Badge, Button, Input, Modal, Select,
} from '@/components/ui';
import { cn } from '@/lib/cn';

const ROLE_OPTIONS: { value: OrgRole; label: string; desc: string }[] = [
  { value: 'staff',      label: 'Staff',          desc: 'Cuidador / personal del establecimiento — gestiona caballos y eventos' },
  { value: 'owner_role', label: 'Propietario',    desc: 'Solo ve los caballos de su propiedad' },
  { value: 'vet',        label: 'Veterinario',    desc: 'Solo ve los caballos a los que esté asignado' },
  { value: 'admin',      label: 'Administrador',  desc: 'Control total sobre la organización' },
];

const PLAN_PRICING: Record<string, { horses: string; price: string }> = {
  free:       { horses: '3 caballos',     price: 'Gratis' },
  basic:      { horses: '15 caballos',    price: 'Stable Basic' },
  pro:        { horses: '50 caballos',    price: 'Stable Pro' },
  enterprise: { horses: 'Sin límite',     price: 'Enterprise' },
};

// ─────────────────────────── KPI Card ───────────────────────────
function Kpi({
  label, value, hint, tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'neutral' | 'gold' | 'success' | 'danger';
}) {
  const accent = {
    neutral: 'text-navy-900',
    gold:    'text-gold-600',
    success: 'text-success-700',
    danger:  'text-danger-700',
  }[tone];
  return (
    <Card className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn('mt-2 text-2xl font-bold tracking-tight', accent)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

// ─────────────────────────── Plan section ───────────────────────────
function PlanPanel({
  plan, horseCount, horseLimit, expiresAt,
}: { plan: string; horseCount: number; horseLimit: number | null; expiresAt: string | null }) {
  const pct = horseLimit ? Math.min((horseCount / horseLimit) * 100, 100) : 0;
  const isPro = plan !== 'free';
  const meta = PLAN_PRICING[plan] ?? { horses: '—', price: PLAN_LABELS[plan as keyof typeof PLAN_LABELS] ?? plan };
  const barTone = pct >= 100 ? 'bg-danger-500' : pct >= 80 ? 'bg-warning-500' : 'bg-navy-700';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Plan actual</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-navy-900">{meta.price}</p>
          <p className="mt-0.5 text-sm text-slate-500">{meta.horses}</p>
          {expiresAt && isPro && (
            <p className="mt-2 text-xs text-slate-500">
              Renueva el {new Date(expiresAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
        <Badge tone={isPro ? 'gold' : 'neutral'} dot>
          {isPro ? 'Activo' : 'Free'}
        </Badge>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-slate-700">
            {horseCount} {horseLimit ? `de ${horseLimit}` : ''} caballos
          </span>
          {horseLimit && pct >= 80 && (
            <span className="text-xs font-medium text-warning-700">Cerca del límite</span>
          )}
        </div>
        {horseLimit ? (
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className={cn('h-full rounded-full transition-all', barTone)} style={{ width: `${pct}%` }} />
          </div>
        ) : (
          <p className="text-xs text-slate-500">Sin límite de caballos</p>
        )}
      </div>

      {!isPro && (
        <Button
          className="mt-5 w-full"
          iconLeft={<Sparkles className="h-4 w-4" />}
          onClick={() => window.open('https://wa.me/5491100000000?text=Hola,%20quiero%20mejorar%20el%20plan%20de%20mi%20organizaci%C3%B3n%20en%20HandicApp', '_blank')}
        >
          Mejorar plan
        </Button>
      )}
    </Card>
  );
}

// ─────────────────────────── Invite modal ───────────────────────────
function InviteModal({
  orgId, open, onClose,
}: { orgId: string; open: boolean; onClose: () => void }) {
  const create = useCreateInvitation(orgId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('staff');
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reset = () => {
    setEmail('');
    setRole('staff');
    setCreatedLink(null);
    setCopied(false);
    setEmailError(null);
    setSubmitError(null);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) {
      setEmailError('Ingresá un email válido');
      return;
    }
    setEmailError(null);
    setSubmitError(null);
    try {
      const inv = await create.mutateAsync({ email: trimmed, role_in_org: role });
      setCreatedLink(`${window.location.origin}/invitacion/${inv.token}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos generar la invitación';
      setSubmitError(msg);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={createdLink ? 'Invitación lista' : 'Invitar miembro'}
      description={createdLink ? 'Compartí este link con la persona invitada. Válido 7 días.' : 'Le mandaremos por mail una invitación con un link único.'}
      size="md"
      footer={
        createdLink ? (
          <Button variant="secondary" onClick={handleClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button type="submit" form="invite-form" loading={create.isPending} disabled={!email.trim()}>
              Generar invitación
            </Button>
          </>
        )
      }
    >
      {!createdLink ? (
        <form id="invite-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="ejemplo@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
            error={emailError ?? undefined}
            autoFocus
            required
          />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700 mb-2">Rol</legend>
            {ROLE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition',
                  role === opt.value
                    ? 'border-navy-700 bg-navy-50'
                    : 'border-slate-200 hover:border-slate-300',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => setRole(opt.value)}
                  className="mt-1 h-4 w-4 accent-navy-700"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500 leading-snug">{opt.desc}</p>
                </div>
              </label>
            ))}
          </fieldset>
          {submitError && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700" role="alert">{submitError}</p>
          )}
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
              <CheckCircle2 className="h-7 w-7 text-success-500" strokeWidth={1.8} aria-hidden />
            </div>
          </div>
          <div className="break-all rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-700">
            {createdLink}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleCopy} iconLeft={<Copy className="h-4 w-4" />}>
              {copied ? 'Copiado' : 'Copiar link'}
            </Button>
            <Button
              variant="secondary"
              iconLeft={<MessageCircle className="h-4 w-4" />}
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`Te invito a HandicApp: ${createdLink}`)}`,
                  '_blank',
                )
              }
            >
              WhatsApp
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────── Remove member confirm ───────────────────────────
function ConfirmRemoveModal({
  open, name, onCancel, onConfirm, loading,
}: { open: boolean; name: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Quitar miembro"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Quitar</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">
        <strong className="text-slate-900">{name}</strong> dejará de ser miembro y perderá el acceso. Esta acción es reversible re-invitando a la persona.
      </p>
    </Modal>
  );
}

// ─────────────────────────── Page ───────────────────────────
export default function OrganizacionPage() {
  const { user } = useAuth();
  const { data: myOrgs, isLoading: loadingOrgs, error: orgsError } = useMyOrganizations();
  const orgId = myOrgs?.[0]?.id ?? null;
  const { data: org, isLoading: loadingOrg, error: orgError } = useOrganization(orgId);
  const { data: invitations } = useOrgInvitations(orgId);
  const removeMember = useRemoveMember(orgId ?? '');
  const cancelInv = useCancelInvitation(orgId ?? '');
  const changeRole = useChangeMemberRole(orgId ?? '');
  const [showInvite, setShowInvite] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);

  if (loadingOrgs || loadingOrg) return <PageLoader />;

  if (orgsError || orgError) {
    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader title="Organización" />
        <Card>
          <p className="text-sm font-semibold text-danger-700">No pudimos cargar tu organización.</p>
          <p className="mt-1 text-sm text-slate-500">
            Revisá tu conexión y volvé a intentar. Si persiste, contactanos.
          </p>
          <Button className="mt-4" variant="secondary" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-3xl space-y-6">
        <PageHeader title="Organización" />
        <EmptyState
          icon={Building2}
          title="Todavía no pertenecés a ninguna organización"
          message="Las organizaciones permiten al establecimiento centralizar el plan, los miembros y los caballos. Si te invitaron, abrí el link de invitación; si querés crear una, escribinos."
        />
      </div>
    );
  }

  const myMember = org.members.find((m) => m.user_id === user?.id);
  const isAdmin = myMember?.role_in_org === 'admin';
  const isOwner = org.owner_id === user?.id;
  const canInvite = isAdmin || isOwner;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title={org.name}
        subtitle="Tu organización en HandicApp"
        badge={{ label: PLAN_LABELS[org.plan], tone: org.plan !== 'free' ? 'gold' : 'neutral' }}
        action={canInvite && (
          <Button onClick={() => setShowInvite(true)} iconLeft={<Plus className="h-4 w-4" />}>
            Invitar miembro
          </Button>
        )}
      />

      {/* KPIs + Plan */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <Kpi label="Caballos" value={org.horse_count} hint={org.horse_limit ? `de ${org.horse_limit} permitidos` : 'sin límite'} />
          <Kpi label="Miembros" value={org.members.length} hint="activos" />
        </div>
        <PlanPanel
          plan={org.plan}
          horseCount={org.horse_count}
          horseLimit={org.horse_limit}
          expiresAt={org.plan_expires_at}
        />
      </div>

      {/* Invitaciones pendientes */}
      {invitations && invitations.length > 0 && (
        <Card padded={false} className="overflow-hidden border-warning-500/30 bg-warning-50/40">
          <div className="border-b border-warning-500/20 px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-warning-700">
              Invitaciones pendientes ({invitations.length})
            </p>
          </div>
          <ul className="divide-y divide-warning-500/10">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-900">{inv.email}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {ROLE_LABELS[inv.role_in_org]} · expira el {new Date(inv.expires_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/invitacion/${inv.token}`)}
                  >
                    Copiar link
                  </Button>
                  {canInvite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelInv.mutate(inv.id)}
                      aria-label={`Cancelar invitación de ${inv.email}`}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Miembros */}
      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-navy-900">
            Miembros <span className="font-normal text-slate-400">({org.members.length})</span>
          </h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {org.members.map((member) => {
            const isOrgOwner = member.user_id === org.owner_id;
            const isMe = member.user_id === user?.id;
            return (
              <li key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white">
                  {member.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy-900">
                    {member.user.name}
                    {isMe && <span className="ml-2 text-[10px] font-normal text-slate-400">(vos)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-400">{member.user.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canInvite && !isOrgOwner ? (
                    <div className="w-36">
                      <Select
                        value={member.role_in_org}
                        onChange={(e) =>
                          changeRole.mutate({ memberId: member.id, role_in_org: e.target.value as OrgRole })
                        }
                        options={ROLE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                        aria-label={`Cambiar rol de ${member.user.name}`}
                      />
                    </div>
                  ) : (
                    <Badge tone={isOrgOwner ? 'gold' : 'neutral'} dot={isOrgOwner}>
                      {isOrgOwner ? 'Dueño' : ROLE_LABELS[member.role_in_org]}
                    </Badge>
                  )}
                  {canInvite && !isOrgOwner && !isMe && (
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft={<UserMinus className="h-3.5 w-3.5" />}
                      onClick={() => setMemberToRemove({ id: member.id, name: member.user.name })}
                      aria-label={`Quitar a ${member.user.name}`}
                    >
                      Quitar
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {orgId && (
        <InviteModal orgId={orgId} open={showInvite} onClose={() => setShowInvite(false)} />
      )}
      <ConfirmRemoveModal
        open={!!memberToRemove}
        name={memberToRemove?.name ?? ''}
        loading={removeMember.isPending}
        onCancel={() => setMemberToRemove(null)}
        onConfirm={async () => {
          if (memberToRemove) {
            await removeMember.mutateAsync(memberToRemove.id);
            setMemberToRemove(null);
          }
        }}
      />
    </div>
  );
}

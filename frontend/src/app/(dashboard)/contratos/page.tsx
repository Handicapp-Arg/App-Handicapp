'use client';

import { useState } from 'react';
import {
  FileSignature, FilePen, Plus, X,
} from 'lucide-react';
import { ContractIllustration } from '@/components/illustrations';
import {
  useContracts, useCreateContract, useSignContract, useRejectContract, useDeleteContract,
  type Contract,
} from '@/hooks/use-contracts';
import { useAuth } from '@/lib/auth-context';
import { usePropietarios, useHorses } from '@/hooks/use-horses';
import {
  PageHeader, Card, Badge, Button, Input, Modal, Select, Textarea,
  EmptyState, ListSkeleton, type BadgeTone,
} from '@/components/ui';

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  pending:  { label: 'Pendiente', tone: 'warning' },
  signed:   { label: 'Firmado',   tone: 'success' },
  rejected: { label: 'Rechazado', tone: 'danger' },
};

const DEFAULT_BODY = `CONTRATO DE PENSIÓN EQUINA

Entre el establecimiento ({establecimiento}) y el propietario ({propietario}), se acuerda:

1. El caballo quedará alojado en las instalaciones del establecimiento.
2. El propietario se compromete al pago mensual según lo acordado.
3. El establecimiento proveerá alimentación, veterinaria básica y cuidados diarios.
4. Cualquier gasto extraordinario (cirugías, medicamentos especiales) será consultado y acordado con el propietario.
5. El contrato tiene una duración mínima de 3 meses, renovable automáticamente.

Firmado digitalmente en HandicApp.`;

// ─────────────────────────── Contract Card ───────────────────────────
function ContractCard({
  contract, userId,
  onSign, onReject, onDelete,
}: {
  contract: Contract;
  userId: string;
  onSign: (c: Contract) => void;
  onReject: (c: Contract) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[contract.status] ?? STATUS_META.pending;
  const isOwner = contract.owner_id === userId;
  const isEstablishment = contract.establishment_id === userId;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.tone} dot>{meta.label}</Badge>
              {contract.horse && <Badge tone="info">{contract.horse.name}</Badge>}
            </div>
            <h3 className="mt-2 text-base font-semibold tracking-tight text-gray-900">{contract.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {isOwner ? (
                <>De <strong className="text-slate-700">{contract.establishment?.name}</strong></>
              ) : (
                <>Para <strong className="text-slate-700">{contract.owner?.name}</strong></>
              )}
              {' · '}
              {new Date(contract.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isEstablishment && contract.status === 'pending' && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(contract.id)}>
                Cancelar
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setExpanded((p) => !p)}>
              {expanded ? 'Cerrar' : 'Ver'}
            </Button>
          </div>
        </div>

        {contract.status === 'signed' && contract.signed_name && (
          <div className="mt-3 rounded-lg border border-success-500/20 bg-success-50 px-3 py-2">
            <p className="text-xs text-success-700">
              Firmado por <strong>{contract.signed_name}</strong> el{' '}
              {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
        )}
        {contract.status === 'rejected' && contract.rejection_reason && (
          <div className="mt-3 rounded-lg border border-danger-500/20 bg-danger-50 px-3 py-2">
            <p className="text-xs text-danger-700">Motivo: {contract.rejection_reason}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
            {contract.body}
          </pre>
          {isOwner && contract.status === 'pending' && (
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => onReject(contract)}>
                Rechazar
              </Button>
              <Button className="flex-1" iconLeft={<FileSignature className="h-4 w-4" />} onClick={() => onSign(contract)}>
                Firmar digitalmente
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────── Page ───────────────────────────
export default function ContratosPage() {
  const { user } = useAuth();
  const { data: contracts, isLoading } = useContracts();
  const { data: propietarios } = usePropietarios();
  const { data: horses } = useHorses();
  const createContract = useCreateContract();
  const signContract = useSignContract();
  const rejectContract = useRejectContract();
  const deleteContract = useDeleteContract();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    owner_id: '',
    horse_id: '',
    title: 'Contrato de Pensión',
    body: DEFAULT_BODY,
  });
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [signedName, setSignedName] = useState('');
  const [rejectingContract, setRejectingContract] = useState<Contract | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isEstablishment = user?.role === 'establecimiento' || user?.role === 'admin';

  const resetForm = () => {
    setForm({ owner_id: '', horse_id: '', title: 'Contrato de Pensión', body: DEFAULT_BODY });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contratos de pensión"
        subtitle="Contratos digitales firmados entre el establecimiento y los propietarios."
        action={isEstablishment ? (
          <Button onClick={() => setShowCreate(true)} iconLeft={<Plus className="h-4 w-4" />}>
            Nuevo contrato
          </Button>
        ) : undefined}
      />

      {/* Lista o estados */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : !contracts?.length ? (
        <EmptyState
          icon={ContractIllustration}
          illustration
          title={isEstablishment ? 'Todavía no creaste contratos' : 'No tenés contratos pendientes'}
          message={
            isEstablishment
              ? 'Generá un contrato digital para que tus propietarios lo firmen sin papel.'
              : 'Cuando un establecimiento te envíe un contrato, lo verás acá.'
          }
          action={isEstablishment ? { label: 'Crear primer contrato', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              userId={user?.id ?? ''}
              onSign={setSigningContract}
              onReject={setRejectingContract}
              onDelete={(id) => deleteContract.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* ── Modal: crear contrato ── */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetForm(); }}
        title="Crear contrato"
        description="El propietario va a recibir una notificación para firmarlo."
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-contract-form"
              loading={createContract.isPending}
              disabled={!form.owner_id || !form.title}
            >
              Crear contrato
            </Button>
          </>
        }
      >
        <form
          id="create-contract-form"
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await createContract.mutateAsync({ ...form, horse_id: form.horse_id || undefined });
            setShowCreate(false);
            resetForm();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Propietario"
              value={form.owner_id}
              onChange={(e) => setForm((p) => ({ ...p, owner_id: e.target.value }))}
              options={(propietarios ?? []).map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Seleccionar propietario"
              required
            />
            <Select
              label="Caballo (opcional)"
              value={form.horse_id}
              onChange={(e) => setForm((p) => ({ ...p, horse_id: e.target.value }))}
              options={[
                { value: '', label: 'Sin caballo específico' },
                ...(horses ?? []).map((h) => ({ value: h.id, label: h.name })),
              ]}
            />
          </div>
          <Input
            label="Título"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
          />
          <Textarea
            label="Cuerpo del contrato"
            value={form.body}
            onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
            rows={10}
            required
          />
        </form>
      </Modal>

      {/* ── Modal: firmar ── */}
      <Modal
        open={!!signingContract}
        onClose={() => { setSigningContract(null); setSignedName(''); }}
        title="Firmar digitalmente"
        description={signingContract ? `“${signingContract.title}”` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSigningContract(null); setSignedName(''); }}>
              Cancelar
            </Button>
            <Button
              loading={signContract.isPending}
              disabled={!signedName.trim()}
              iconLeft={<FilePen className="h-4 w-4" />}
              onClick={async () => {
                if (!signingContract) return;
                await signContract.mutateAsync({ id: signingContract.id, signed_name: signedName.trim() });
                setSigningContract(null);
                setSignedName('');
              }}
            >
              Confirmar firma
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Escribí tu nombre completo tal como aparecerá en la firma. Quedará registrado con fecha y hora.
          </p>
          <Input
            label="Tu nombre completo"
            value={signedName}
            onChange={(e) => setSignedName(e.target.value)}
            placeholder="Ej. Juan Pérez"
            autoFocus
          />
        </div>
      </Modal>

      {/* ── Modal: rechazar ── */}
      <Modal
        open={!!rejectingContract}
        onClose={() => { setRejectingContract(null); setRejectReason(''); }}
        title="Rechazar contrato"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectingContract(null); setRejectReason(''); }}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={rejectContract.isPending}
              iconLeft={<X className="h-4 w-4" />}
              onClick={async () => {
                if (!rejectingContract) return;
                await rejectContract.mutateAsync({ id: rejectingContract.id, reason: rejectReason });
                setRejectingContract(null);
                setRejectReason('');
              }}
            >
              Confirmar rechazo
            </Button>
          </>
        }
      >
        <Textarea
          label="Motivo del rechazo (opcional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
          placeholder="¿Hay algo que querés que ajusten antes de firmar?"
        />
      </Modal>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useContracts, useCreateContract, useSignContract, useRejectContract, useDeleteContract, type Contract } from '@/hooks/use-contracts';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/auth-context';
import { usePropietarios, useHorses } from '@/hooks/use-horses';

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700' },
  signed:   { label: 'Firmado',   cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Rechazado', cls: 'bg-red-50 text-red-700' },
};

const DEFAULT_BODY = `CONTRATO DE PENSIÓN EQUINA

Entre el establecimiento ({establecimiento}) y el propietario ({propietario}), se acuerda:

1. El caballo quedará alojado en las instalaciones del establecimiento.
2. El propietario se compromete al pago mensual según lo acordado.
3. El establecimiento proveerá alimentación, veterinaria básica y cuidados diarios.
4. Cualquier gasto extraordinario (cirugías, medicamentos especiales) será consultado y acordado con el propietario.
5. El contrato tiene una duración mínima de 3 meses, renovable automáticamente.

Firmado digitalmente en HandicApp.`;

function ContractCard({
  contract,
  role,
  userId,
  onSign,
  onReject,
  onDelete,
}: {
  contract: Contract;
  role: string;
  userId: string;
  onSign: (c: Contract) => void;
  onReject: (c: Contract) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const badge = statusBadge[contract.status] ?? statusBadge.pending;
  const isOwner = contract.owner_id === userId;
  const isEstablishment = contract.establishment_id === userId;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>
              {contract.horse && (
                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">{contract.horse.name}</span>
              )}
            </div>
            <h3 className="mt-1.5 font-semibold text-gray-900">{contract.title}</h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {isOwner ? `De: ${contract.establishment?.name}` : `Para: ${contract.owner?.name}`}
              {' · '}
              {new Date(contract.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isEstablishment && contract.status === 'pending' && (
              <button onClick={() => onDelete(contract.id)}
                className="rounded-lg border border-red-100 px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50 transition cursor-pointer"
              >Cancelar</button>
            )}
            <button onClick={() => setExpanded((p) => !p)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50 transition cursor-pointer"
            >{expanded ? 'Cerrar' : 'Ver'}</button>
          </div>
        </div>

        {contract.status === 'signed' && contract.signed_name && (
          <div className="mt-2 rounded-lg bg-green-50 px-3 py-2 border border-green-100">
            <p className="text-[11px] text-green-700">
              Firmado por <span className="font-semibold">{contract.signed_name}</span> el{' '}
              {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
        )}

        {contract.status === 'rejected' && contract.rejection_reason && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 border border-red-100">
            <p className="text-[11px] text-red-700">Motivo: {contract.rejection_reason}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <pre className="whitespace-pre-wrap text-xs text-gray-700 font-sans leading-relaxed">{contract.body}</pre>

          {isOwner && contract.status === 'pending' && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => onReject(contract)}
                className="flex-1 rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
              >Rechazar</button>
              <button onClick={() => onSign(contract)}
                className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition cursor-pointer"
              >Firmar digitalmente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [form, setForm] = useState({ owner_id: '', horse_id: '', title: 'Contrato de Pensión', body: DEFAULT_BODY });
  const [signingContract, setSigningContract] = useState<Contract | null>(null);
  const [signedName, setSignedName] = useState('');
  const [rejectingContract, setRejectingContract] = useState<Contract | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const isEstablishment = user?.role === 'establecimiento' || user?.role === 'admin';

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:bg-white focus:outline-none';

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#0f1f3d' }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contratos de pensión"
        subtitle="Contratos digitales firmados entre el establecimiento y los propietarios."
        action={isEstablishment ? (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition cursor-pointer active:scale-95"
            style={{ backgroundColor: '#0f1f3d' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo contrato
          </button>
        ) : undefined}
      />

      {/* Nuevo contrato */}
      {showCreate && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Crear contrato</h2>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            await createContract.mutateAsync({ ...form, horse_id: form.horse_id || undefined });
            setShowCreate(false);
            setForm({ owner_id: '', horse_id: '', title: 'Contrato de Pensión', body: DEFAULT_BODY });
          }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Propietario</label>
                <select value={form.owner_id} onChange={(e) => setForm((p) => ({ ...p, owner_id: e.target.value }))} className={inputCls} required>
                  <option value="">Seleccionar...</option>
                  {propietarios?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Caballo (opcional)</label>
                <select value={form.horse_id} onChange={(e) => setForm((p) => ({ ...p, horse_id: e.target.value }))} className={inputCls}>
                  <option value="">Sin caballo específico</option>
                  {horses?.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Título</label>
              <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className={inputCls} required />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Cuerpo del contrato</label>
              <textarea rows={10} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} className={inputCls} required />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >Cancelar</button>
              <button type="submit" disabled={createContract.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition cursor-pointer"
                style={{ backgroundColor: '#0f1f3d' }}
              >{createContract.isPending ? 'Creando...' : 'Crear contrato'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {!contracts?.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">
            {isEstablishment ? 'No hay contratos creados. Creá el primero.' : 'No tenés contratos pendientes.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              role={user?.role ?? ''}
              userId={user?.id ?? ''}
              onSign={setSigningContract}
              onReject={setRejectingContract}
              onDelete={(id) => deleteContract.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Modal firmar */}
      {signingContract && (
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" onClick={() => setSigningContract(null)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
              <div className="px-5 py-4 bg-green-600">
                <p className="font-bold text-white">Firmar digitalmente</p>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">
                  Para firmar el contrato <span className="font-semibold">"{signingContract.title}"</span>, escribí tu nombre completo tal como aparecerá en la firma.
                </p>
                <input
                  type="text"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  placeholder="Tu nombre completo..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                />
                <p className="text-[11px] text-gray-400">
                  Al confirmar, tu firma quedará registrada con fecha y hora en el sistema.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setSigningContract(null)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >Cancelar</button>
                  <button
                    disabled={!signedName.trim() || signContract.isPending}
                    onClick={async () => {
                      await signContract.mutateAsync({ id: signingContract.id, signed_name: signedName.trim() });
                      setSigningContract(null);
                      setSignedName('');
                    }}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-green-700 transition cursor-pointer"
                  >{signContract.isPending ? 'Firmando...' : 'Confirmar firma'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal rechazar */}
      {rejectingContract && (
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" onClick={() => setRejectingContract(null)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
              <div className="px-5 py-4 bg-red-500">
                <p className="font-bold text-white">Rechazar contrato</p>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">Indicá el motivo del rechazo (opcional).</p>
                <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Motivo del rechazo..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-gray-400 focus:bg-white focus:outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={() => setRejectingContract(null)}
                    className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                  >Cancelar</button>
                  <button
                    disabled={rejectContract.isPending}
                    onClick={async () => {
                      await rejectContract.mutateAsync({ id: rejectingContract.id, reason: rejectReason });
                      setRejectingContract(null);
                      setRejectReason('');
                    }}
                    className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-red-600 transition cursor-pointer"
                  >{rejectContract.isPending ? 'Rechazando...' : 'Confirmar rechazo'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

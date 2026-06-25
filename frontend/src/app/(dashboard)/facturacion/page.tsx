'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth-context';
import { useBills, useCreateBill, useSendBill, useApproveBill, useDisputeBill, useDeleteBill, STATUS_META, monthLabel } from '@/hooks/use-billing';
import { PageHeader } from '@/components/ui/page-header';
import { useHorses } from '@/hooks/use-horses';
import ConfirmDialog from '@/components/confirm-dialog';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][i] }));

function CreateBillModal({ onClose }: { onClose: () => void }) {
  const { data: horses } = useHorses();
  const createBill = useCreateBill();
  const now = new Date();
  const [horseId, setHorseId] = useState(horses?.[0]?.id ?? '');
  const [ownerId, setOwnerId] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [items, setItems] = useState<{ description: string; quantity: string; unit_price: string }[]>([
    { description: '', quantity: '1', unit_price: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');

  const selectedHorse = horses?.find((h) => h.id === horseId);

  const addItem = () => setItems([...items, { description: '', quantity: '1', unit_price: '' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const total = items.reduce((sum, i) => sum + (parseFloat(i.quantity || '0') * parseFloat(i.unit_price || '0')), 0);

  const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#9d6c35] focus:bg-white focus:outline-none';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horseId || !ownerId) return;
    await createBill.mutateAsync({
      horse_id: horseId,
      owner_id: ownerId,
      month,
      year,
      currency,
      items: items.filter((i) => i.description && i.unit_price).map((i) => ({
        description: i.description,
        quantity: parseFloat(i.quantity),
        unit_price: parseFloat(i.unit_price),
      })),
      notes: notes || undefined,
    });
    onClose();
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998] bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl my-4">
          <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl" style={{ backgroundColor: '#9d6c35' }}>
            <h2 className="text-base font-semibold text-white">Nueva factura</h2>
            <button onClick={onClose} className="text-white/70 hover:text-white cursor-pointer">✕</button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Caballo y período */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Caballo *</label>
                <select value={horseId} onChange={(e) => { setHorseId(e.target.value); setOwnerId(horses?.find(h => h.id === e.target.value)?.owner_id ?? ''); }} className={inputCls} required>
                  <option value="">Seleccionar...</option>
                  {horses?.filter((h) => h.establishment_id).map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Propietario *</label>
                <input readOnly value={selectedHorse?.owner?.name ?? ''} placeholder="Automático"
                  className={`${inputCls} bg-gray-100 cursor-not-allowed`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Mes</label>
                <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className={inputCls}>
                  {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Año</label>
                <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} min={2020} className={inputCls} />
              </div>
            </div>

            {/* Moneda */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Moneda</label>
              <div className="flex gap-2">
                {(['ARS', 'USD'] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setCurrency(c)}
                    className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition cursor-pointer ${
                      currency === c ? 'bg-[#9d6c35] text-white border-transparent' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {c === 'ARS' ? '$ ARS — Pesos' : 'USD — Dólares'}
                  </button>
                ))}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600">Ítems</label>
                <button type="button" onClick={addItem} className="text-xs font-medium text-[#9d6c35] hover:underline cursor-pointer">+ Agregar ítem</button>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                  <input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                    placeholder="Descripción" className={inputCls} required
                  />
                  <input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                    placeholder="Cant." min="0" step="0.01" className={inputCls}
                  />
                  <input type="number" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                    placeholder="$ precio" min="0" step="0.01" className={inputCls} required
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 cursor-pointer text-lg leading-none">✕</button>
                  )}
                </div>
              ))}
              <div className="text-right text-sm font-bold text-gray-900">
                Total: ${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-600">Notas (opcional)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">Cancelar</button>
              <button type="submit" disabled={createBill.isPending || !horseId || !ownerId}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer" style={{ backgroundColor: '#9d6c35' }}
              >
                {createBill.isPending ? 'Creando...' : 'Crear borrador'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default function FacturacionPage() {
  const { user } = useAuth();
  const { data: bills, isLoading } = useBills();
  const sendBill = useSendBill();
  const approveBill = useApproveBill();
  const disputeBill = useDisputeBill();
  const deleteBill = useDeleteBill();

  const [showCreate, setShowCreate] = useState(false);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isEst = user?.role === 'establecimiento';
  const isProp = user?.role === 'propietario';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Facturación"
        action={isEst ? (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition cursor-pointer active:scale-95"
            style={{ backgroundColor: '#9d6c35' }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva factura
          </button>
        ) : undefined}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-gray-100 border-t-[#9d6c35]" />
        </div>
      ) : !bills?.length ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">
            {isEst ? 'No hay facturas creadas todavía.' : 'No recibiste facturas todavía.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => {
            const meta = STATUS_META[bill.status];
            return (
              <div key={bill.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {bill.horse && <span className="text-sm font-semibold text-gray-800">{bill.horse.name}</span>}
                      <span className="text-sm text-gray-500">{monthLabel(bill.month, bill.year)}</span>
                    </div>
                    {bill.dispute_reason && (
                      <p className="mt-1 text-xs text-red-500">Motivo: {bill.dispute_reason}</p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-gray-900 shrink-0">
                    {(bill as { currency?: string }).currency === 'USD' ? 'USD ' : '$'}{Number(bill.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Items */}
                <div className="rounded-lg bg-gray-50 p-3 space-y-1.5">
                  {bill.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                      <span>{item.description}</span>
                      <span className="font-medium">{item.quantity} × ${item.unit_price.toLocaleString('es-AR')} = ${item.total.toLocaleString('es-AR')}</span>
                    </div>
                  ))}
                  {bill.notes && <p className="text-xs text-gray-400 pt-1 border-t border-gray-200">{bill.notes}</p>}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  {/* Botón PDF */}
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('token');
                      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
                      const res = await fetch(`${base}/billing/${bill.id}/pdf`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `factura-${bill.horse?.name ?? 'caballo'}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    PDF
                  </button>
                  {isEst && bill.status === 'borrador' && (
                    <>
                      <button onClick={() => sendBill.mutate(bill.id)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                      >
                        Enviar al propietario
                      </button>
                      <button onClick={() => setDeletingId(bill.id)}
                        className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                  {isProp && bill.status === 'enviada' && (
                    <>
                      <button onClick={() => approveBill.mutate(bill.id)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                      >
                        Aprobar
                      </button>
                      <button onClick={() => setDisputingId(bill.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer"
                      >
                        Disputar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateBillModal onClose={() => setShowCreate(false)} />}

      {/* Modal disputar */}
      {disputingId && createPortal(
        <>
          <div className="fixed inset-0 z-[998] bg-black/50" onClick={() => setDisputingId(null)} />
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 space-y-4">
              <h3 className="text-base font-bold text-gray-900">Disputar factura</h3>
              <textarea rows={3} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explicá el motivo de la disputa..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm resize-none focus:border-[#9d6c35] focus:bg-white focus:outline-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setDisputingId(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 cursor-pointer">Cancelar</button>
                <button
                  disabled={!disputeReason.trim()}
                  onClick={async () => {
                    await disputeBill.mutateAsync({ id: disputingId, reason: disputeReason });
                    setDisputingId(null);
                    setDisputeReason('');
                  }}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  Confirmar disputa
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}

      {deletingId && (
        <ConfirmDialog
          title="¿Eliminar factura?"
          message="Solo podés eliminar facturas en borrador."
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={async () => { await deleteBill.mutateAsync(deletingId); setDeletingId(null); }}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

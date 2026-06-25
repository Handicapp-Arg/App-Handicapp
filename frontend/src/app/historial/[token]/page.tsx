'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface PublicHistory {
  horse: { name: string; breed?: { name: string }; activity?: { name: string }; birth_date: string | null };
  events: Array<{ id: string; type: string; description: string; amount: number | null; date: string }>;
  weights: Array<{ id: string; weight_kg: number; body_condition: number | null; date: string }>;
  expires_at: string;
}

const typeBadge: Record<string, string> = {
  salud: 'bg-red-50 text-red-700',
  entrenamiento: 'bg-yellow-50 text-yellow-700',
  gasto: 'bg-purple-50 text-purple-700',
  nota: 'bg-gray-100 text-gray-700',
};

const typeLabel: Record<string, string> = {
  salud: 'Salud', entrenamiento: 'Entrenamiento', gasto: 'Gasto', nota: 'Nota',
};

export default function PublicHistoryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const { data, isLoading, error } = useQuery<PublicHistory>({
    queryKey: ['public-history', token],
    queryFn: async () => (await api.get(`/horses/shared/${token}`)).data,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: '#9d6c35' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-900">Enlace inválido o expirado</h1>
        <p className="text-sm text-gray-500 text-center">
          Este enlace de historial ya no es válido. Pedile al propietario que genere uno nuevo.
        </p>
      </div>
    );
  }

  const { horse, events, weights, expires_at } = data;
  const expiresDate = new Date(expires_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: '#9d6c35' }}>
              <span className="text-base font-bold text-white">H</span>
            </div>
            <div>
              <p className="text-xs text-gray-400">Historial compartido via HandicApp</p>
              <p className="text-xs text-gray-300">Válido hasta: {expiresDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4 sm:p-8 space-y-6">

        {/* Info del caballo */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{horse.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {horse.breed && (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{horse.breed.name}</span>
            )}
            {horse.activity && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{horse.activity.name}</span>
            )}
          </div>
          {horse.birth_date && (
            <p className="mt-2 text-sm text-gray-500">
              Nacimiento: {new Date(horse.birth_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Peso */}
        {weights.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">Registro de peso</h2>
            <div className="space-y-2">
              {weights.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2">
                  <div>
                    <span className="font-bold text-orange-900">{Number(w.weight_kg)} kg</span>
                    {w.body_condition && <span className="ml-2 text-xs text-orange-600">CC: {w.body_condition}/9</span>}
                  </div>
                  <span className="text-xs text-orange-400">
                    {new Date(w.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de eventos */}
        {events.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">Historial de eventos ({events.length})</h2>
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeBadge[ev.type] ?? typeBadge.nota}`}>
                      {typeLabel[ev.type] ?? ev.type}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(ev.date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{ev.description}</p>
                  {ev.amount != null && (
                    <p className="text-xs font-semibold text-purple-700 mt-1">${Number(ev.amount).toLocaleString('es-AR')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-300">
          Generado con HandicApp · Este enlace expira automáticamente
        </p>
      </div>
    </div>
  );
}

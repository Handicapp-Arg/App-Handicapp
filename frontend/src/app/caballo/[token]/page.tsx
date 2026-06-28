'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface PublicPhoto { id: string; url: string; file_type: 'image' | 'video'; }

interface PublicProfile {
  id: string;
  name: string;
  birth_date: string | null;
  image_url: string | null;
  microchip: string | null;
  breed: { name: string } | null;
  activity: { name: string } | null;
  owner: { name: string };
  establishment: { name: string } | null;
  events: Array<{ id: string; type: string; description: string; date: string; amount: number | null; is_public: boolean; photos: PublicPhoto[] }>;
  weights: Array<{ id: string; weight_kg: number; body_condition: number | null; date: string }>;
  medical: Array<{ id: string; type: string; name: string; date: string; next_due: string | null }>;
}

function MediaGrid({ photos }: { photos: PublicPhoto[] }) {
  if (!photos.length) return null;
  const cols = photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
  return (
    <div className={`grid ${cols} gap-0.5`}>
      {photos.slice(0, 6).map((p, i) => (
        <div key={p.id} className={`relative bg-gray-900 ${photos.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
          {p.file_type === 'video' ? (
            <>
              <video src={p.url} className="h-full w-full object-cover opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80">
                  <svg className="h-5 w-5 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
            </>
          ) : (
            <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
          )}
          {i === 5 && photos.length > 6 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-xl font-bold text-white">+{photos.length - 6}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const TYPE_BADGE: Record<string, string> = {
  salud: 'bg-red-50 text-red-700',
  entrenamiento: 'bg-yellow-50 text-yellow-700',
  gasto: 'bg-purple-50 text-purple-700',
  nota: 'bg-gray-100 text-gray-700',
};
const TYPE_LABEL: Record<string, string> = {
  salud: 'Salud', entrenamiento: 'Entrenamiento', gasto: 'Gasto', nota: 'Nota',
};
const MED_BADGE: Record<string, string> = {
  vacuna: 'bg-green-50 text-green-700',
  desparasitacion: 'bg-orange-50 text-orange-700',
  analisis: 'bg-blue-50 text-blue-700',
  tratamiento: 'bg-red-50 text-red-700',
};
const MED_LABEL: Record<string, string> = {
  vacuna: 'Vacuna', desparasitacion: 'Desparasitación', analisis: 'Análisis', tratamiento: 'Tratamiento',
};

function fmt(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PublicProfilePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const { data, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ['public-profile', token],
    queryFn: async () => (await api.get(`/horses/public/${token}`)).data,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200" style={{ borderTopColor: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-4xl">🔒</div>
        <h1 className="text-xl font-bold text-gray-900">Caballo no encontrado</h1>
        <p className="text-sm text-gray-500 text-center">Este código QR no corresponde a ningún caballo registrado en HandicApp.</p>
      </div>
    );
  }

  const age = data.birth_date
    ? Math.floor((Date.now() - new Date(data.birth_date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const upcomingVaccines = data.medical.filter((m) => m.next_due && new Date(m.next_due) >= new Date());
  const publicFeed = data.events.filter((ev) => ev.is_public && ev.photos.length > 0);
  const lastWeight = data.weights[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header branding */}
      <div className="border-b border-gray-200 bg-[var(--surface-card)] px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: 'var(--color-clay-500)' }}>
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <span className="text-sm font-semibold text-gray-500">HandicApp · Perfil público</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4 sm:p-8 space-y-5">

        {/* Hero caballo */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[var(--surface-card)] shadow-sm">
          {data.image_url && (
            <div className="aspect-[16/7] overflow-hidden">
              <img src={data.image_url} alt={data.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-5">
            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.breed && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{data.breed.name}</span>}
              {data.activity && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{data.activity.name}</span>}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {age !== null && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Edad</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900">{age} {age === 1 ? 'año' : 'años'}</p>
                </div>
              )}
              {data.birth_date && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Nacimiento</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900">{fmt(data.birth_date)}</p>
                </div>
              )}
              {data.owner && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Propietario</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 truncate">{data.owner.name}</p>
                </div>
              )}
              {data.establishment && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Establecimiento</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 truncate">{data.establishment.name}</p>
                </div>
              )}
              {data.microchip && (
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Microchip</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900 font-mono">{data.microchip}</p>
                </div>
              )}
              {lastWeight && (
                <div className="rounded-xl bg-orange-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-500">Último peso</p>
                  <p className="mt-0.5 text-sm font-bold text-orange-900">{Number(lastWeight.weight_kg)} kg</p>
                  {lastWeight.body_condition && <p className="text-[10px] text-orange-500">CC {lastWeight.body_condition}/9</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feed público — fotos/videos de eventos */}
        {publicFeed.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h2 className="text-base font-bold text-gray-900">Publicaciones recientes</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {publicFeed.map((ev) => (
                <div key={ev.id}>
                  <MediaGrid photos={ev.photos} />
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[ev.type] ?? TYPE_BADGE.nota}`}>
                        {TYPE_LABEL[ev.type] ?? ev.type}
                      </span>
                      <span className="text-[11px] text-gray-400">{fmt(ev.date)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximas vacunas/dosis */}
        {upcomingVaccines.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-bold text-amber-800 mb-3">⏰ Próximas dosis</h2>
            <div className="space-y-2">
              {upcomingVaccines.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MED_BADGE[m.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {MED_LABEL[m.type] ?? m.type}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-700">{fmt(m.next_due!)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial médico */}
        {data.medical.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">Historial médico ({data.medical.length})</h2>
            <div className="space-y-2">
              {data.medical.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${MED_BADGE[m.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {MED_LABEL[m.type] ?? m.type}
                    </span>
                    <span className="text-sm text-gray-800 truncate">{m.name}</span>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400 ml-2">{fmt(m.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial de eventos (salud y entrenamiento) */}
        {data.events.filter((e) => ['salud', 'entrenamiento'].includes(e.type)).length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-[var(--surface-card)] p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 mb-3">Eventos relevantes</h2>
            <div className="space-y-2">
              {data.events
                .filter((e) => ['salud', 'entrenamiento'].includes(e.type))
                .slice(0, 15)
                .map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[ev.type] ?? TYPE_BADGE.nota}`}>
                        {TYPE_LABEL[ev.type] ?? ev.type}
                      </span>
                      <span className="text-xs text-gray-400">{fmt(ev.date)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{ev.description}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          Perfil generado con HandicApp · La información es provista por el propietario o establecimiento
        </p>
      </div>
    </div>
  );
}

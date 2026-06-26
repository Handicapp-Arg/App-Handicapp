'use client';

import { useState } from 'react';
import { useTrainingMetrics, useUpsertTrainingMetrics } from '@/hooks/use-events';

const INTENSITY_LABELS = ['', 'Muy liviano', 'Liviano', 'Moderado', 'Intenso', 'Máximo'];

interface Props {
  eventId: string;
  canEdit: boolean;
}

export function TrainingMetricsPanel({ eventId, canEdit }: Props) {
  const { data: metrics } = useTrainingMetrics(eventId);
  const upsert = useUpsertTrainingMetrics(eventId);
  const [editing, setEditing] = useState(false);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('');
  const [discipline, setDiscipline] = useState('');

  const openEdit = () => {
    setDistance(metrics?.distance_km != null ? String(metrics.distance_km) : '');
    setDuration(metrics?.duration_min != null ? String(metrics.duration_min) : '');
    setIntensity(metrics?.intensity != null ? String(metrics.intensity) : '');
    setDiscipline(metrics?.discipline ?? '');
    setEditing(true);
  };

  const save = async () => {
    await upsert.mutateAsync({
      distance_km: distance ? parseFloat(distance) : undefined,
      duration_min: duration ? parseInt(duration) : undefined,
      intensity: intensity ? parseInt(intensity) : undefined,
      discipline: discipline || undefined,
    });
    setEditing(false);
  };

  const hasData = metrics && (metrics.distance_km || metrics.duration_min || metrics.intensity || metrics.discipline);

  if (!hasData && !canEdit) return null;

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:border-gray-400 focus:bg-[var(--surface-card)] focus:outline-none';

  return (
    <div className="mt-2 rounded-lg bg-yellow-50 border border-yellow-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">Métricas de entrenamiento</p>
        {canEdit && !editing && (
          <button onClick={openEdit} className="text-xs font-medium text-yellow-600 hover:underline cursor-pointer">
            {hasData ? 'Editar' : '+ Agregar'}
          </button>
        )}
      </div>

      {!editing ? (
        hasData ? (
          <div className="flex flex-wrap gap-3">
            {metrics.distance_km != null && (
              <div>
                <p className="text-[10px] text-yellow-600 font-medium uppercase">Distancia</p>
                <p className="text-sm font-bold text-yellow-900">{metrics.distance_km} km</p>
              </div>
            )}
            {metrics.duration_min != null && (
              <div>
                <p className="text-[10px] text-yellow-600 font-medium uppercase">Duración</p>
                <p className="text-sm font-bold text-yellow-900">{metrics.duration_min} min</p>
              </div>
            )}
            {metrics.intensity != null && (
              <div>
                <p className="text-[10px] text-yellow-600 font-medium uppercase">Intensidad</p>
                <p className="text-sm font-bold text-yellow-900">{metrics.intensity}/5 — {INTENSITY_LABELS[metrics.intensity]}</p>
              </div>
            )}
            {metrics.discipline && (
              <div>
                <p className="text-[10px] text-yellow-600 font-medium uppercase">Disciplina</p>
                <p className="text-sm font-bold text-yellow-900">{metrics.discipline}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-yellow-500">Sin métricas registradas</p>
        )
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-yellow-700 mb-1">Distancia (km)</label>
              <input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0.0" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-yellow-700 mb-1">Duración (min)</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-yellow-700 mb-1">Intensidad (1-5)</label>
              <select value={intensity} onChange={(e) => setIntensity(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {[1,2,3,4,5].map((n) => (
                  <option key={n} value={n}>{n} — {INTENSITY_LABELS[n]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-yellow-700 mb-1">Disciplina</label>
              <input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Salto, doma, polo..." className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer">Cancelar</button>
            <button onClick={save} disabled={upsert.isPending}
              className="rounded-md bg-yellow-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer hover:bg-yellow-700 transition"
            >
              {upsert.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

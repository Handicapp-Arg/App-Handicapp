'use client';

import { useState } from 'react';
import { usePlanStatus } from '@/hooks/use-plan';
import { useAuth } from '@/lib/auth-context';

export function PlanBanner() {
  const { user } = useAuth();
  const { data: plan } = usePlanStatus();
  const [dismissed, setDismissed] = useState(false);

  // Solo cuando el propietario tiene al menos 1 caballo y está cerca o en el límite
  if (!plan || dismissed) return null;
  if (user?.role !== 'propietario' && user?.role !== 'establecimiento') return null;
  if (plan.plan !== 'free') return null;
  if (!plan.horse_limit) return null;
  // Solo mostrar cuando están en el último slot o ya superaron el límite
  if (plan.horse_count < plan.horse_limit - 1) return null;

  const pct = Math.min((plan.horse_count / plan.horse_limit) * 100, 100);
  const atLimit = plan.is_limited;

  return (
    <div className={`rounded-2xl border p-4 mb-5 ${atLimit ? 'border-amber-200 bg-amber-50' : 'border-orange-100 bg-orange-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="text-xl shrink-0">{atLimit ? '🚫' : '⚠️'}</span>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${atLimit ? 'text-amber-800' : 'text-orange-800'}`}>
              {atLimit
                ? 'Límite del plan gratuito alcanzado'
                : `Último cupo disponible — ${plan.horse_count}/${plan.horse_limit} caballos`}
            </p>
            <p className={`text-xs mt-0.5 ${atLimit ? 'text-amber-600' : 'text-orange-600'}`}>
              {atLimit
                ? 'No podés agregar más caballos. Contactá al administrador para actualizar a Pro.'
                : 'El plan gratuito incluye hasta 3 caballos. Hablá con el administrador para activar Pro.'}
            </p>
            <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${atLimit ? 'bg-amber-500' : 'bg-orange-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
        <button onClick={() => setDismissed(true)}
          className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-1 shrink-0"
          title="Cerrar"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

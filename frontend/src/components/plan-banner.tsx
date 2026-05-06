'use client';

import { useState } from 'react';
import { usePlanStatus, useActivatePro } from '@/hooks/use-plan';
import { useAuth } from '@/lib/auth-context';

export function PlanBanner() {
  const { user } = useAuth();
  const { data: plan } = usePlanStatus();
  const activatePro = useActivatePro();
  const [dismissed, setDismissed] = useState(false);

  // Solo mostramos a propietarios y establecimientos en plan free con > 0 caballos
  if (!plan || dismissed) return null;
  if (user?.role !== 'propietario' && user?.role !== 'establecimiento') return null;
  if (plan.plan !== 'free') return null;
  if (plan.horse_count === 0) return null;

  const pct = plan.horse_limit ? Math.min((plan.horse_count / plan.horse_limit) * 100, 100) : 0;
  const nearLimit = plan.horse_limit != null && plan.horse_count >= plan.horse_limit - 1;

  return (
    <div className={`rounded-2xl border p-4 mb-5 ${nearLimit ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl shrink-0">{nearLimit ? '⚠️' : '🐎'}</span>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${nearLimit ? 'text-amber-800' : 'text-blue-800'}`}>
              {nearLimit
                ? plan.is_limited
                  ? 'Límite de caballos alcanzado'
                  : `Casi en el límite — ${plan.horse_count}/${plan.horse_limit} caballos`
                : `Plan Gratuito — ${plan.horse_count}/${plan.horse_limit} caballos`}
            </p>
            <p className={`text-xs mt-0.5 ${nearLimit ? 'text-amber-600' : 'text-blue-600'}`}>
              {plan.is_limited
                ? 'Actualizá a Pro para agregar más caballos y desbloquear todas las funciones.'
                : `El plan gratuito incluye hasta ${plan.horse_limit} caballos.`}
            </p>
            {plan.horse_limit && (
              <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-white/60 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${nearLimit ? 'bg-amber-500' : 'bg-blue-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => activatePro.mutate(1)}
            disabled={activatePro.isPending}
            className="rounded-lg bg-[#0f1f3d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f1f3d]/90 transition cursor-pointer disabled:opacity-50"
          >
            {activatePro.isPending ? '...' : 'Ir a Pro'}
          </button>
          <button onClick={() => setDismissed(true)}
            className="text-gray-400 hover:text-gray-600 transition cursor-pointer p-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

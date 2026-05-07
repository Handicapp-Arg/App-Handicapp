'use client';

import { useState } from 'react';
import { usePlanStatus } from '@/hooks/use-plan';
import { useAuth } from '@/lib/auth-context';

const WHATSAPP_LINK = 'https://wa.me/5491100000000?text=Hola,%20quiero%20mejorar%20mi%20plan%20en%20HandicApp';

export function PlanBanner() {
  const { user } = useAuth();
  const { data: plan } = usePlanStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!plan || dismissed) return null;
  if (user?.role !== 'propietario' && user?.role !== 'establecimiento') return null;
  if (plan.plan !== 'free') return null;
  if (!plan.horse_limit) return null;
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
                ? 'Llegaste al límite de tu plan gratuito'
                : `Último cupo disponible — ${plan.horse_count}/${plan.horse_limit} caballos`}
            </p>
            <p className={`text-xs mt-0.5 ${atLimit ? 'text-amber-600' : 'text-orange-600'}`}>
              {atLimit
                ? 'Contactanos para mejorar tu plan y seguir agregando caballos.'
                : 'Actualizá tu plan antes de quedarte sin cupo.'}
            </p>
            <div className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-white/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${atLimit ? 'bg-amber-500' : 'bg-orange-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0f1f3d] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a1628] transition cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z" />
              </svg>
              Contactanos para mejorar plan
            </a>
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

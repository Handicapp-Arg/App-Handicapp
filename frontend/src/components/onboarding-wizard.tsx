'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY = 'handicapp_onboarding_done_v1';

const STEPS_BY_ROLE: Record<string, Array<{ icon: string; title: string; body: string }>> = {
  establecimiento: [
    { icon: '🏇', title: 'Registrá tus caballos', body: 'Desde "Caballos" podés dar de alta cada equino con foto, raza, actividad y propietario.' },
    { icon: '📋', title: 'Registrá eventos', body: 'Anotá salud, entrenamiento, gastos y notas en el historial de cada caballo.' },
    { icon: '💊', title: 'Historial médico', body: 'Registrá vacunas, desparasitaciones, análisis y tratamientos con fecha de próxima dosis.' },
    { icon: '📅', title: 'Agenda y rutinas', body: 'Coordiná turnos veterinarios y marcá las rutinas diarias de cada caballo.' },
    { icon: '💰', title: 'Facturación', body: 'Generá y enviá facturas de pensión. Los propietarios las reciben y pueden aprobarlas.' },
  ],
  propietario: [
    { icon: '🏇', title: 'Tus caballos', body: 'Desde "Caballos" ves el estado actualizado de todos tus equinos.' },
    { icon: '📋', title: 'Historial completo', body: 'Accedé al historial de eventos, salud, peso y fotos verificadas.' },
    { icon: '💊', title: 'Historial médico', body: 'Revisá las vacunas, desparasitaciones y tratamientos registrados.' },
    { icon: '🔗', title: 'Compartí el historial', body: 'Generá un enlace temporal para compartir el historial de tu caballo con el veterinario.' },
    { icon: '💰', title: 'Facturas', body: 'Recibí y aprobá las facturas de pensión del establecimiento.' },
  ],
  veterinario: [
    { icon: '🏇', title: 'Caballos asignados', body: 'Accedés a los caballos donde el establecimiento te asignó como veterinario.' },
    { icon: '💊', title: 'Historial médico', body: 'Registrá vacunas, desparasitaciones, análisis y tratamientos con próxima dosis.' },
    { icon: '📋', title: 'Eventos de salud', body: 'Agregá eventos de tipo "Salud" en el historial de cada caballo.' },
    { icon: '📅', title: 'Agenda', body: 'Coordiná tus turnos de atención desde la sección Agenda.' },
  ],
  default: [
    { icon: '👋', title: 'Bienvenido a HandicApp', body: 'La plataforma para gestión profesional de caballos.' },
    { icon: '🏇', title: 'Explorá caballos', body: 'Desde "Caballos" podés ver los equinos disponibles.' },
    { icon: '📋', title: 'Seguí el historial', body: 'Cada caballo tiene historial de eventos, médico, peso y fotos.' },
  ],
};

export function OnboardingWizard() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  if (!mounted || !visible || !user) return null;

  const steps = STEPS_BY_ROLE[user.role] ?? STEPS_BY_ROLE.default;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[990] bg-black/60 backdrop-blur-sm" onClick={finish} />
      <div className="fixed inset-0 z-[991] flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, #0f1f3d 0%, #1a3a6b 100%)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">HandicApp</span>
              <button onClick={finish} className="text-white/40 hover:text-white transition cursor-pointer text-sm">✕</button>
            </div>
            <div className="text-5xl mb-3">{current.icon}</div>
            <h2 className="text-xl font-bold text-white leading-tight">{current.title}</h2>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="text-sm text-gray-600 leading-relaxed">{current.body}</p>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mt-5">
              {steps.map((_, i) => (
                <button key={i} onClick={() => setStep(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${i === step ? 'w-6 bg-[#0f1f3d]' : 'w-1.5 bg-gray-200'}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              {step > 0 && (
                <button onClick={() => setStep((p) => p - 1)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Anterior
                </button>
              )}
              <button
                onClick={isLast ? finish : () => setStep((p) => p + 1)}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition cursor-pointer"
                style={{ backgroundColor: '#0f1f3d' }}
              >
                {isLast ? '¡Empezar!' : 'Siguiente'}
              </button>
            </div>

            {!isLast && (
              <button onClick={finish} className="w-full mt-2 text-center text-xs text-gray-400 hover:text-gray-600 transition cursor-pointer">
                Saltar tutorial
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

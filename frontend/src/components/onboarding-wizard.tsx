'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  HorseIllustration, EventsIllustration, OrganizationIllustration, ContractIllustration,
  InboxIllustration, WelcomeIllustration,
} from '@/components/illustrations';
import { cn } from '@/lib/cn';

const STORAGE_KEY = 'handicapp_onboarding_done_v2';

interface OnboardingStep {
  illustration: ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
}

const STEPS_BY_ROLE: Record<string, OnboardingStep[]> = {
  establecimiento: [
    {
      illustration: WelcomeIllustration,
      eyebrow: 'Bienvenido',
      title: 'Gestioná tu establecimiento sin papeles',
      body: 'En 5 pasos te mostramos las funciones principales. Vas a poder volver al menú lateral cuando quieras.',
    },
    {
      illustration: HorseIllustration,
      eyebrow: 'Paso 1',
      title: 'Cargá tus caballos',
      body: 'Desde Caballos das de alta cada equino con foto, raza, actividad y propietario. La info queda disponible para vos y los dueños.',
    },
    {
      illustration: EventsIllustration,
      eyebrow: 'Paso 2',
      title: 'Registrá eventos del día a día',
      body: 'Anotá controles de salud, entrenamientos, gastos y notas en el historial de cada caballo. Quedan listos para auditoría o consulta.',
    },
    {
      illustration: OrganizationIllustration,
      eyebrow: 'Paso 3',
      title: 'Invitá a tu equipo y a los propietarios',
      body: 'Desde Organización gestionás miembros con roles (staff, veterinario, propietario invitado) bajo tu mismo plan.',
    },
    {
      illustration: ContractIllustration,
      eyebrow: 'Paso 4',
      title: 'Contratos y facturas digitales',
      body: 'Generá contratos y facturas que los propietarios firman o aprueban desde su celular. Cero papel.',
    },
  ],
  propietario: [
    {
      illustration: WelcomeIllustration,
      eyebrow: 'Bienvenido',
      title: 'Tu historial equino, siempre a mano',
      body: 'Vas a ver el estado, los eventos y los documentos de tus caballos. Y vas a poder compartirlos con tu veterinario en segundos.',
    },
    {
      illustration: HorseIllustration,
      eyebrow: 'Paso 1',
      title: 'Revisá tus caballos',
      body: 'Desde Caballos accedés a la ficha completa: peso, raza, fotos verificadas y eventos recientes.',
    },
    {
      illustration: EventsIllustration,
      eyebrow: 'Paso 2',
      title: 'Seguí el día a día',
      body: 'Cada evento de salud, entrenamiento o gasto que registra el establecimiento aparece acá. Vos también podés cargar tus propias notas.',
    },
    {
      illustration: InboxIllustration,
      eyebrow: 'Paso 3',
      title: 'Compartí el historial con tu vet',
      body: 'Generá un link temporal con todo el historial médico del caballo. Tu veterinario lo abre sin cuenta.',
    },
    {
      illustration: ContractIllustration,
      eyebrow: 'Paso 4',
      title: 'Firmá contratos y aprobá facturas',
      body: 'Recibí los contratos y facturas de tu establecimiento. Firmás digitalmente desde el celular.',
    },
  ],
  veterinario: [
    {
      illustration: WelcomeIllustration,
      eyebrow: 'Bienvenido',
      title: 'Atendé a tus pacientes con todo el contexto',
      body: 'Cada caballo asignado trae su historial médico, peso, eventos y próximos vencimientos a un toque.',
    },
    {
      illustration: HorseIllustration,
      eyebrow: 'Paso 1',
      title: 'Acá están tus pacientes',
      body: 'Vas a ver únicamente los caballos donde el establecimiento o propietario te asignó como veterinario.',
    },
    {
      illustration: EventsIllustration,
      eyebrow: 'Paso 2',
      title: 'Registrá vacunas, tratamientos y análisis',
      body: 'Cada registro queda en el historial con fecha y próxima dosis. La app te avisa antes del vencimiento.',
    },
    {
      illustration: OrganizationIllustration,
      eyebrow: 'Paso 3',
      title: 'Coordiná turnos desde la Agenda',
      body: 'Ves tus visitas y atenciones programadas, y marcás las que ya hiciste.',
    },
  ],
  default: [
    {
      illustration: WelcomeIllustration,
      eyebrow: 'Bienvenido',
      title: 'Empezá a usar HandicApp',
      body: 'La plataforma para gestión profesional de caballos. Vas a poder volver a este tour desde la pantalla de perfil.',
    },
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

  const steps = useMemo(
    () => (user ? STEPS_BY_ROLE[user.role] ?? STEPS_BY_ROLE.default : []),
    [user],
  );

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' && step < steps.length - 1) setStep((p) => p + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep((p) => p - 1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step, steps.length]);

  if (!mounted || !visible || !user || steps.length === 0) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const Illustration = current.illustration;

  return createPortal(
    <>
      <div className="animate-fade-in fixed inset-0 z-[990] bg-navy-900/60 backdrop-blur-md" onClick={finish} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="fixed inset-0 z-[991] flex items-center justify-center p-4"
      >
        <div className="animate-fade-in-up flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="relative flex flex-col items-center bg-gradient-to-br from-navy-800 to-navy-700 px-6 pb-6 pt-8">
            <button
              type="button"
              onClick={finish}
              aria-label="Cerrar tutorial"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="rounded-full bg-white/5 p-4 ring-1 ring-white/10">
              <Illustration className="h-28 w-28 text-white" />
            </div>
          </div>

          <div className="px-7 py-6">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gold-600">
              {current.eyebrow}
            </p>
            <h2 id="onboarding-title" className="mt-1 text-xl font-bold tracking-tight text-gray-900">
              {current.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{current.body}</p>

            <div className="mt-6 flex justify-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Ir al paso ${i + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === step ? 'w-6 bg-navy-700' : 'w-1.5 bg-slate-200 hover:bg-slate-300',
                  )}
                />
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep((p) => p - 1)} className="flex-1">
                  Anterior
                </Button>
              )}
              <Button
                onClick={isLast ? finish : () => setStep((p) => p + 1)}
                className="flex-1"
                iconRight={isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              >
                {isLast ? 'Empezar a usar HandicApp' : 'Siguiente'}
              </Button>
            </div>

            {!isLast && (
              <button
                type="button"
                onClick={finish}
                className="mt-3 w-full text-center text-xs text-slate-400 transition hover:text-slate-600"
              >
                Saltar tour
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

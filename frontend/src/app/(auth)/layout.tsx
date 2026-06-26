import { HorseshoeH } from '@/components/icons/equine';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12 bg-[var(--surface-page)]">
      {/* Acento de marca muy sutil detrás de la tarjeta (cuero tenue, no satura) */}
      <div
        className="pointer-events-none absolute left-1/2 top-[20%] h-[460px] w-[460px] -translate-x-1/2 rounded-full opacity-[0.07] blur-[130px]"
        style={{ background: 'radial-gradient(circle, var(--color-clay-500) 0%, transparent 70%)' }}
      />

      {/* Control de tema */}
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      {/* Contenido */}
      <div className="relative w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-9 animate-fade-in-up">
          <HorseshoeH size={46} strokeWidth={1.9} className="text-[var(--color-primary)]" />
          <span className="mt-3 font-display text-[26px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">
            HandicApp
          </span>
        </div>

        <div
          className="relative animate-fade-in-up rounded-3xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] p-7 shadow-[var(--shadow-lg)]"
          style={{ animationDelay: '80ms' }}
        >
          {children}
        </div>

        <p className="mt-10 text-center text-[11px] text-[var(--color-gray-400)] tracking-[0.15em] uppercase">
          Plataforma de gestión ecuestre
        </p>
      </div>
    </div>
  );
}

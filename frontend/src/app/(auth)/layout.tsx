import { HorseshoeH } from '@/components/icons/equine';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: 'linear-gradient(180deg, var(--color-cream-100) 0%, var(--surface-page) 58%)' }}
    >
      {/* Fondo: doble glow de marca muy sutil — spotlight cuero tras el logo +
          halo cálido abajo, para que el oscuro no quede liso (discreto). */}
      <div
        className="pointer-events-none absolute left-1/2 top-[12%] h-[540px] w-[540px] -translate-x-1/2 rounded-full opacity-[0.11] blur-[140px]"
        style={{ background: 'radial-gradient(circle, var(--color-clay-500) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute left-[28%] bottom-[6%] h-[380px] w-[380px] rounded-full opacity-[0.06] blur-[150px]"
        style={{ background: 'radial-gradient(circle, var(--color-amber-glow) 0%, transparent 70%)' }}
      />

      {/* Control de tema */}
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      {/* Contenido */}
      <div className="relative w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-9 animate-fade-in-up">
          <HorseshoeH size={64} className="text-[var(--color-primary)] drop-shadow-[0_2px_22px_rgba(157,108,53,0.30)]" />
          <span className="mt-3.5 font-display text-[30px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">
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

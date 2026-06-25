const LOGO = 'https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 py-12"
      style={{ backgroundColor: '#1b130c' }}
    >
      {/* Glow cálido detrás de la marca */}
      <div
        className="pointer-events-none absolute left-1/2 top-[18%] h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-clay-500) 50%, transparent) 0%, color-mix(in srgb, var(--color-clay-400) 16%, transparent) 45%, transparent 70%)' }}
      />
      {/* Grid técnico sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
        }}
      />
      {/* Isotipo gigante como marca de agua */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO}
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-28 w-[460px] opacity-[0.035] select-none"
      />
      {/* Viñeta inferior */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />

      {/* Contenido */}
      <div className="relative w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-9 animate-fade-in-up">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="HandicApp" className="h-28 w-auto object-contain" />
        </div>

        <div
          className="relative animate-fade-in-up rounded-3xl border border-white/[0.08] bg-white/[0.035] p-7 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl"
          style={{ animationDelay: '80ms' }}
        >
          {/* Highlight superior sutil */}
          <div className="pointer-events-none absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          {children}
        </div>

        <p className="mt-10 text-center text-[11px] text-white/25 tracking-[0.15em] uppercase">
          Plataforma de gestión ecuestre
        </p>
      </div>
    </div>
  );
}

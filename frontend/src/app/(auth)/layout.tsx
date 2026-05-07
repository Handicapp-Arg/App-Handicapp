const FEATURES = [
  {
    icon: (
      <svg className="h-4 w-4 text-[#c4922a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    text: 'Caballos, eventos y registros médicos en un solo lugar',
  },
  {
    icon: (
      <svg className="h-4 w-4 text-[#c4922a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    text: 'Recordatorios automáticos de vacunas y desparasitaciones',
  },
  {
    icon: (
      <svg className="h-4 w-4 text-[#c4922a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    text: 'Contratos digitales entre establecimientos y propietarios',
  },
  {
    icon: (
      <svg className="h-4 w-4 text-[#c4922a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    text: 'App mobile para gestionar desde el campo en tiempo real',
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Mobile: header compacto */}
      <div className="lg:hidden flex flex-col items-center justify-center py-8 px-6" style={{ backgroundColor: '#0f1f3d' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png"
          alt="HandicApp"
          className="h-8 w-auto object-contain mb-2"
        />
        <p className="text-xs text-white/40 font-medium tracking-wide">Gestión ecuestre profesional</p>
      </div>

      {/* Desktop: panel izquierdo con imagen de fondo */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col justify-between px-12 xl:px-16 py-12"
        style={{ backgroundColor: '#0a1628' }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://res.cloudinary.com/dh2m9ychv/image/upload/v1762370534/logo-full-white_suu2qt.png"
          alt="HandicApp"
          className="h-8 w-auto object-contain"
        />

        {/* Copy central */}
        <div className="space-y-10">
          <div className="space-y-4">
            <p className="text-[2.5rem] font-bold text-white leading-[1.1] tracking-[-0.03em]">
              La plataforma ecuestre <span style={{ color: '#c4922a' }}>profesional</span>
            </p>
            <p className="text-[15px] text-white/45 leading-relaxed max-w-xs">
              Gestioná tu haras con la misma herramienta que usan establecimientos, veterinarios y propietarios.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="shrink-0">{f.icon}</span>
                <p className="text-sm text-white/55 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/20 tracking-wide">© 2026 HandicApp · Todos los derechos reservados</p>
      </div>

      {/* Panel formulario */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f3f8] px-6 py-10 lg:py-0">
        <div className="w-full max-w-[360px]">
          {children}
        </div>
      </div>

    </div>
  );
}

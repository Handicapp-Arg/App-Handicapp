const FEATURES = [
  { icon: '🐎', text: 'Gestioná caballos, eventos y registros médicos en un solo lugar' },
  { icon: '💊', text: 'Recordatorios automáticos de vacunas y desparasitaciones' },
  { icon: '📄', text: 'Contratos digitales firmados entre establecimientos y propietarios' },
  { icon: '📲', text: 'App mobile para gestionar desde el campo en tiempo real' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Mobile: header compacto */}
      <div className="lg:hidden flex flex-col items-center justify-center py-10 px-6" style={{ backgroundColor: '#0f1f3d' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <span className="text-lg font-bold text-white">H</span>
          </div>
          <p className="text-2xl font-bold text-white tracking-tight">HandicApp</p>
        </div>
        <p className="text-sm text-white/45">Gestión ecuestre profesional</p>
      </div>

      {/* Desktop: panel izquierdo */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between px-14 py-14"
        style={{ backgroundColor: '#0f1f3d' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12">
            <span className="text-base font-bold text-white">H</span>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">HandicApp</span>
        </div>

        {/* Copy central */}
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[2.25rem] font-extrabold text-white leading-[1.15] tracking-tight">
              La plataforma para gestión ecuestre profesional
            </p>
            <p className="text-base text-white/50 leading-relaxed max-w-sm">
              Organizá caballos, veterinarios, establecimientos y propietarios desde un mismo lugar.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-3.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{f.icon}</span>
                <p className="text-sm text-white/60 leading-relaxed">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/25">© 2026 HandicApp · Todos los derechos reservados</p>
      </div>

      {/* Panel formulario */}
      <div className="flex-1 flex flex-col bg-gray-50 lg:items-center lg:justify-center">
        <div className="w-full max-w-sm mx-auto px-6 py-10 lg:py-0">
          {children}
        </div>
      </div>

    </div>
  );
}

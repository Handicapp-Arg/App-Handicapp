export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* Mobile: header branding */}
      <div
        className="lg:hidden flex flex-col items-center justify-center pt-20 pb-14 px-6"
        style={{ backgroundColor: '#0f1f3d' }}
      >
        <p className="text-3xl font-bold text-white tracking-tight">HandicApp</p>
        <p className="text-sm mt-2 text-white/50">Gestión ecuestre profesional</p>
        <div className="w-10 h-0.5 mx-auto rounded-full mt-4 bg-white/30" />
      </div>

      {/* Desktop: panel izquierdo */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-16"
        style={{ backgroundColor: '#0f1f3d' }}
      >
        <div className="max-w-xs w-full text-center">
          <p className="text-4xl font-bold text-white tracking-tight">HandicApp</p>
          <p className="text-sm mt-3 text-white/50">Gestión ecuestre profesional</p>
          <div className="w-10 h-0.5 mx-auto rounded-full mt-4 bg-white/30" />
        </div>
      </div>

      {/* Panel formulario */}
      <div className="flex-1 flex flex-col px-6 py-10 bg-gray-50 lg:items-center lg:justify-center">
        <div className="w-full max-w-sm mx-auto">
          {children}
        </div>
      </div>

    </div>
  );
}

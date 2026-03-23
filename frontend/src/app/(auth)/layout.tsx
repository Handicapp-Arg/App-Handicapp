export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-[#1a1a2e] p-12 text-white">
        <blockquote className="text-3xl font-light leading-snug text-white/90">
          "Gestión profesional para el mundo ecuestre."
        </blockquote>
        <p className="mt-4 text-sm text-white/50">
          Caballos, eventos y establecimientos — todo en un lugar.
        </p>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">

          {children}
        </div>
      </div>
    </div>
  );
}

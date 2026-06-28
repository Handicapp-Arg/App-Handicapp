'use client';

import { usePathname } from 'next/navigation';

/**
 * Anima el contenido de las pantallas de auth en cada navegación (login →
 * registro → recuperar contraseña). El `key={pathname}` fuerza el re-montaje,
 * así la animación se vuelve a disparar al cambiar de ruta.
 */
export function AuthTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-auth-slide">
      {children}
    </div>
  );
}

import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

/**
 * Contenedor de ancho — UNA sola fuente de verdad para el ancho del contenido.
 *
 * REGLA DE CONSISTENCIA: TODAS las páginas usan el MISMO ancho (APP_WIDTH) para
 * que la app se vea igual en todas las secciones y roles. El `width` se mantiene
 * por compatibilidad de API, pero hoy todas las variantes resuelven al mismo
 * ancho — no hay páginas más anchas que otras. Si en el futuro un formulario
 * necesita ser más angosto, se limita su contenido interno, NO el marco.
 */
type Width = 'wide' | 'content' | 'narrow';

const APP_WIDTH = 'max-w-[1400px]';

const WIDTHS: Record<Width, string> = {
  wide: APP_WIDTH,
  content: APP_WIDTH,
  narrow: APP_WIDTH,
};

export function Container({
  width = 'content',
  className,
  children,
}: {
  width?: Width;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('mx-auto w-full', WIDTHS[width], className)}>{children}</div>;
}

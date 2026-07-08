import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

/**
 * Contenedor de ancho responsive — una sola fuente de verdad para el ancho del
 * contenido, en vez de que cada página elija su max-w ad-hoc.
 *
 * Escala de notebook a 4K sin fijar resoluciones: el tope evita líneas de texto
 * ilegiblemente largas en pantallas enormes, y las LISTAS usan grids fluidos
 * (auto-fill) para aprovechar el ancho con más columnas.
 *
 *  - `wide`    listas / dashboards → aprovecha el monitor (hasta 1600px)
 *  - `content` contenido general (default) → ~1152px
 *  - `narrow`  formularios / lectura → líneas cortas y legibles (~672px)
 */
type Width = 'wide' | 'content' | 'narrow';

const WIDTHS: Record<Width, string> = {
  wide: 'max-w-[1600px]',
  content: 'max-w-6xl',
  narrow: 'max-w-2xl',
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

import { isValidElement, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  /** Lucide icon component, ilustración SVG o ReactElement custom. */
  icon?: LucideIcon | ComponentType<{ className?: string }> | ReactNode;
  /** Si true, renderiza el icono más grande (ilustraciones). */
  illustration?: boolean;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  className?: string;
}

function renderIcon(icon: EmptyStateProps['icon'], illustration?: boolean): ReactNode {
  if (!icon) {
    return <Inbox className="h-6 w-6" strokeWidth={1.7} aria-hidden />;
  }
  if (isValidElement(icon)) {
    return icon;
  }
  const Icon = icon as ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  return (
    <Icon
      className={illustration ? 'h-32 w-32' : 'h-6 w-6'}
      {...(illustration ? {} : { strokeWidth: 1.7 })}
      aria-hidden
    />
  );
}

/**
 * Estado vacío con voz consistente. Las copias por defecto evitan "Sin datos"
 * y otros placeholders genéricos — el componente exige título descriptivo.
 * Cuando `illustration` es true, el icono se renderiza grande sin la cajita navy
 * (pensado para ilustraciones de marca).
 */
export function EmptyState({
  icon,
  illustration,
  title,
  message,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[var(--surface-card)] px-8 py-16 text-center',
        className,
      )}
    >
      <div
        className={cn(
          'mb-4 flex items-center justify-center text-navy-500',
          illustration ? 'h-32 w-32' : 'h-14 w-14 rounded-2xl bg-navy-50',
        )}
      >
        {renderIcon(icon, illustration)}
      </div>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {message && <p className="mt-1.5 max-w-sm text-sm text-slate-500">{message}</p>}
      {(action || secondary) && (
        <div className="mt-5 flex items-center gap-2">
          {action && <Button onClick={action.onClick}>{action.label}</Button>}
          {secondary && (
            <Button variant="secondary" onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

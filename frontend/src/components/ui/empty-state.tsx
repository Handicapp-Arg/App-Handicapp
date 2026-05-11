import { type LucideIcon, Inbox } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Estado vacío con voz consistente. Las copias por defecto evitan "Sin datos"
 * y otros placeholders genéricos — el componente exige título descriptivo.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-8 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy-500">
        <Icon className="h-6 w-6" strokeWidth={1.7} aria-hidden />
      </div>
      <p className="text-sm font-semibold text-navy-900">{title}</p>
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

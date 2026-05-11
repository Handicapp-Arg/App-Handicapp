import { type LucideIcon, AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/cn';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: LucideIcon;
  className?: string;
}

export function ErrorState({
  title = 'Algo se trabó',
  message = 'No pudimos traer la información. Probá de nuevo en unos segundos.',
  onRetry,
  retryLabel = 'Reintentar',
  icon: Icon = AlertTriangle,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-danger-500/20 bg-danger-50/40 px-8 py-12 text-center',
        className,
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-50 text-danger-500">
        <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
      </div>
      <p className="text-sm font-semibold text-navy-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && (
        <Button className="mt-5" variant="secondary" onClick={onRetry} iconLeft={<RotateCw className="h-4 w-4" />}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

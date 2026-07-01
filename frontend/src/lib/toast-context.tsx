'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  /** Título opcional en negrita. */
  title?: string;
  /** Duración en ms antes del auto-cierre. Default 4000 (6000 para error). */
  duration?: number;
}

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  title?: string;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, opts?: ToastOptions) => void;
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: 'border-l-success-500',
    iconColor: 'text-success-500',
  },
  error: {
    icon: XCircle,
    accent: 'border-l-danger-500',
    iconColor: 'text-danger-500',
  },
  info: {
    icon: Info,
    accent: 'border-l-clay-500',
    iconColor: 'text-clay-500 dark:text-clay-300',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info', opts?: ToastOptions) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant, title: opts?.title }]);
      const duration = opts?.duration ?? (variant === 'error' ? 6000 : 4000);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, opts) => toast(message, 'success', opts),
      error: (message, opts) => toast(message, 'error', opts),
      info: (message, opts) => toast(message, 'info', opts),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-end gap-2 p-4 sm:right-4 sm:top-4 sm:items-end sm:p-0">
            {toasts.map((t) => {
              const { icon: Icon, accent, iconColor } = VARIANT_STYLES[t.variant];
              return (
                <div
                  key={t.id}
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'animate-fade-in-up pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-100 border-l-4 bg-[var(--surface-card)] px-4 py-3 shadow-lg',
                    accent,
                  )}
                >
                  <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconColor)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    {t.title && (
                      <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                    )}
                    <p className={cn('text-sm text-slate-600', t.title && 'mt-0.5')}>
                      {t.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Cerrar"
                    className="-mr-1 -mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

const NOOP_TOAST: ToastContextValue = {
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
};

/**
 * Devuelve el API de toasts. Si se usa fuera de <ToastProvider> (p. ej. en
 * páginas públicas donde el provider no está montado) hace no-op en vez de
 * romper — así los hooks compartidos pueden llamarlo sin riesgo.
 */
export function useToast(): ToastContextValue {
  return useContext(ToastContext) ?? NOOP_TOAST;
}

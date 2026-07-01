'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  /** Texto del botón de acción. Default "Confirmar". */
  confirmLabel?: string;
  /** Texto del botón cancelar. Default "Cancelar". */
  cancelLabel?: string;
  /** Estilo peligro (rojo) e ícono de alerta. Para eliminar/destruir. */
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface DialogState extends ConfirmOptions {
  open: boolean;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false, title: '' });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setState({ ...opts, open: true });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const settle = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={state.open}
        onClose={() => settle(false)}
        size="sm"
        dismissible
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          {state.danger && (
            <div className="mb-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-danger-50 sm:mb-0 sm:mr-4">
              <AlertTriangle className="h-5 w-5 text-danger-500" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight text-gray-900">
              {state.title}
            </h2>
            {state.message && (
              <div className="mt-1.5 text-sm text-slate-600">{state.message}</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => settle(false)}>
            {state.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button
            variant={state.danger ? 'danger' : 'primary'}
            onClick={() => settle(true)}
          >
            {state.confirmLabel ?? 'Confirmar'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  }
  return ctx;
}

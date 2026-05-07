/**
 * EmptyState para web — espejo de EmptyState.tsx de mobile.
 * Reemplaza el texto gris genérico "No hay datos".
 */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-8 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {message && <p className="mt-1.5 text-sm text-gray-400 max-w-sm">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
          style={{ backgroundColor: '#0f1f3d' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

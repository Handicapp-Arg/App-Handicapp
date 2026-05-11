/**
 * Skeletons específicos por pantalla. Cada uno reproduce el LAYOUT real de la
 * página correspondiente — ancho de columnas, número de filas, jerarquía —
 * para evitar el "salto" que dan los spinners genéricos al cargar datos.
 */
import { cn } from '@/lib/cn';

function Bar({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} />;
}

function CardBox({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-slate-100 bg-white p-5', className)}>
      {children}
    </div>
  );
}

// ─────────────────────────── Header común ───────────────────────────
function HeaderSkeleton() {
  return (
    <div className="mb-7 flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Bar className="h-6 w-44" />
        <Bar className="h-3 w-64 opacity-70" />
      </div>
      <Bar className="h-10 w-32 rounded-xl" />
    </div>
  );
}

// ─────────────────────────── Organización ───────────────────────────
export function OrganizacionSkeleton() {
  return (
    <div className="max-w-5xl space-y-6">
      <HeaderSkeleton />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid grid-cols-2 gap-4 md:col-span-2">
          <CardBox>
            <Bar className="h-3 w-16" />
            <Bar className="mt-3 h-7 w-10" />
            <Bar className="mt-2 h-3 w-24 opacity-70" />
          </CardBox>
          <CardBox>
            <Bar className="h-3 w-16" />
            <Bar className="mt-3 h-7 w-8" />
            <Bar className="mt-2 h-3 w-20 opacity-70" />
          </CardBox>
        </div>
        <CardBox className="space-y-3">
          <Bar className="h-3 w-20" />
          <Bar className="h-6 w-28" />
          <Bar className="h-3 w-24 opacity-70" />
          <Bar className="h-2 w-full rounded-full" />
        </CardBox>
      </div>

      <CardBox className="space-y-3">
        <Bar className="h-3 w-32" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Bar className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bar className="h-3 w-40" />
              <Bar className="h-3 w-24 opacity-60" />
            </div>
            <Bar className="h-7 w-32 rounded-lg" />
          </div>
        ))}
      </CardBox>
    </div>
  );
}

// ─────────────────────────── Superadmin ───────────────────────────
export function SuperadminSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <CardBox key={i} className="space-y-3">
            <Bar className="h-3 w-20" />
            <Bar className="h-8 w-28" />
            <Bar className="h-3 w-32 opacity-70" />
          </CardBox>
        ))}
      </div>

      <div className="flex gap-3">
        <Bar className="h-10 flex-1 rounded-xl" />
        <Bar className="h-10 w-40 rounded-xl" />
      </div>

      <CardBox className="space-y-3 p-0">
        <div className="border-b border-slate-100 px-4 py-3">
          <Bar className="h-3 w-32" />
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3">
            <div className="col-span-2 space-y-2">
              <Bar className="h-3 w-32" />
              <Bar className="h-3 w-20 opacity-60" />
            </div>
            <Bar className="h-5 w-14 rounded-full" />
            <Bar className="h-3 w-24 opacity-70" />
            <Bar className="h-3 w-20 opacity-70" />
            <div className="flex justify-end gap-2">
              <Bar className="h-7 w-14 rounded-lg" />
              <Bar className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </CardBox>
    </div>
  );
}

// ─────────────────────────── Lista genérica ───────────────────────────
/** Skeleton "lista de items con avatar" — útil en eventos, notificaciones, etc. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3"
        >
          <Bar className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bar className="h-3 w-3/5" />
            <Bar className="h-3 w-2/5 opacity-60" />
          </div>
          <Bar className="h-5 w-16 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton loaders para web — espejo visual de Skeleton.tsx de mobile.
 * Reemplaza spinners genéricos durante la carga.
 */

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
      <SkeletonBlock className="h-40 rounded-xl" />
      <SkeletonBlock className="h-4 w-3/5" />
      <SkeletonBlock className="h-3 w-2/5" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
      <SkeletonBlock className="h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3.5 w-3/5" />
        <SkeletonBlock className="h-3 w-2/5" />
      </div>
      <SkeletonBlock className="h-5 w-16 rounded-full shrink-0" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-3.5 ${i === lines - 1 ? 'w-3/5' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
      <SkeletonBlock className="h-3 w-1/2" />
      <SkeletonBlock className="h-7 w-4/5" />
    </div>
  );
}

/** Spinner inline liviano para botones o dentro de cards */
export function Spinner({ size = 'md', color = 'primary' }: { size?: 'sm' | 'md' | 'lg'; color?: 'primary' | 'white' | 'gray' }) {
  const sizes = { sm: 'h-4 w-4 border-[2px]', md: 'h-6 w-6 border-[2.5px]', lg: 'h-8 w-8 border-[3px]' };
  const colors = {
    primary: 'border-gray-200 border-t-[#0f1f3d]',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-100 border-t-gray-400',
  };
  return (
    <div className={`animate-spin rounded-full ${sizes[size]} ${colors[color]}`} />
  );
}

/** Loading de página completa */
export function PageLoader() {
  return (
    <div className="flex justify-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

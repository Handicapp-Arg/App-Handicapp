// Estilos compartidos de las pantallas de auth (login / registro / recuperar).
// Basado en tokens --surface-* para ser dark-aware sin clases sueltas por página.

/** Clase de input unificada para los formularios de auth. */
export const authInputClass =
  'w-full rounded-xl border border-[var(--surface-card-border)] bg-[var(--surface-page)] px-4 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-clay-400 focus:bg-[var(--surface-card)] focus:ring-4 focus:ring-clay-500/15';

/** Clase del H1 unificada (mismo tamaño en las tres pantallas). */
export const authTitleClass = 'text-[19px] font-bold tracking-[-0.02em] text-gray-900';

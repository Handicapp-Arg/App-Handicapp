/**
 * Semáforo sanitario. Vive aparte del servicio a propósito: lo usan tanto la
 * libreta como el listado de caballos, y el servicio arrastra el generador de
 * PDF, que no tiene nada que hacer en una consulta de listado.
 */
export type HealthStatus = 'verde' | 'amarillo' | 'rojo';

/** Deriva el semáforo a partir del next_due (YYYY-MM-DD) del último registro sanitario. */
export function healthStatusFromNextDue(nextDue: string | null | undefined): HealthStatus {
  if (!nextDue) return 'rojo';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(nextDue + 'T00:00:00');
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'rojo';
  if (diffDays <= 15) return 'amarillo';
  return 'verde';
}

/**
 * Semáforo sanitario. Vive aparte del servicio a propósito: lo usan tanto la
 * libreta como el listado de caballos, y el servicio arrastra el generador de
 * PDF, que no tiene nada que hacer en una consulta de listado.
 */
export type HealthStatus = 'verde' | 'amarillo' | 'rojo';

/**
 * Deriva el semáforo a partir del next_due del último registro sanitario.
 *
 * Acepta tanto `YYYY-MM-DD` como una fecha ISO completa. No es cortesía: el
 * driver de Postgres convierte las columnas `date` en objetos Date cuando la
 * consulta es cruda, y eso llega como `2026-09-15T00:00:00.000Z`. Antes se le
 * pegaba `T00:00:00` encima, quedaba una fecha inválida y el semáforo decía
 * VERDE a caballos con la vacuna vencida hace meses.
 *
 * Y si igual no puede leer la fecha, falla hacia el lado SEGURO: dice rojo.
 * Un semáforo sanitario que ante la duda afirma "está sano" es peor que no
 * tener semáforo.
 */
export function healthStatusFromNextDue(nextDue: string | Date | null | undefined): HealthStatus {
  if (!nextDue) return 'rojo';

  // Solo el día importa: se toman los diez primeros caracteres y se ancla al
  // mediodía local para que ningún corrimiento de zona horaria cambie la fecha.
  const iso = nextDue instanceof Date ? nextDue.toISOString() : String(nextDue);
  const due = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.getTime())) return 'rojo';

  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return 'rojo';
  if (diffDays <= 15) return 'amarillo';
  return 'verde';
}

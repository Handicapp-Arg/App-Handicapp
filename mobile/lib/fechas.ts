/**
 * Helpers de fechas "humanas" para toda la app.
 *
 * Las apps consolidadas (Uber, YPF, Airbnb) nunca le muestran al usuario un
 * ISO crudo ("2026-09-01") ni un `toLocaleString` genérico ("01/09/2026
 * 14:30") — dicen "Hoy 14:30", "Mañana", "vie 5 sep" o "hace 2 días".
 *
 * Esta es la ÚNICA fuente de fechas de cara al usuario. Cualquier pantalla
 * que necesite mostrar una fecha debe pasar por acá — nunca formatear a mano
 * con `toLocaleDateString` / `toLocaleString` / `Intl.DateTimeFormat`.
 *
 * También expone `hora(iso)` ("14:30") y `diaLargo(iso)` ("miércoles 3 de
 * septiembre") para los casos en que solo hace falta la hora o el día
 * completo (encabezados de agenda, subtítulos de "hoy").
 *
 * Importante: estos helpers son solo para PRESENTACIÓN. El valor que viaja
 * al backend o a un `<DatePicker>` sigue siendo el ISO crudo tal cual.
 */
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Convierte un string a `Date`, tolerando dos formatos habituales en la app:
 * - Fecha sola ("2026-09-01"): se ancla al mediodía local para no correrse
 *   un día por el huso horario (el problema clásico de `new Date('2026-09-01')`).
 * - Timestamp completo (ISO con hora): se parsea tal cual.
 *
 * Devuelve `null` si el string no es una fecha válida.
 */
function aFecha(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = new Date(soloFecha ? `${iso}T12:00:00` : iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Fecha humana sin hora: "Hoy", "Mañana", "Ayer" o "vie 5 sep"
 * (agrega el año solo si es distinto al actual: "vie 5 sep 2027").
 *
 * Ante una fecha inválida devuelve `''` (nunca "Invalid Date").
 */
export function fechaHumana(iso: string | null | undefined): string {
  const d = aFecha(iso);
  if (!d) return '';
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  if (isYesterday(d)) return 'Ayer';
  const mismoAnio = d.getFullYear() === new Date().getFullYear();
  return format(d, mismoAnio ? 'EEE d MMM' : 'EEE d MMM yyyy', { locale: es });
}

/**
 * Fecha + hora humana: "Hoy 14:30", "Mañana 09:00", "Ayer 09:15" o
 * "vie 5 sep, 14:30" (con año si difiere del actual).
 *
 * Ante una fecha inválida devuelve `''`.
 */
export function fechaHoraHumana(iso: string | null | undefined): string {
  const d = aFecha(iso);
  if (!d) return '';
  const hora = format(d, 'HH:mm');
  if (isToday(d)) return `Hoy ${hora}`;
  if (isTomorrow(d)) return `Mañana ${hora}`;
  if (isYesterday(d)) return `Ayer ${hora}`;
  const mismoAnio = d.getFullYear() === new Date().getFullYear();
  return `${format(d, mismoAnio ? 'EEE d MMM' : 'EEE d MMM yyyy', { locale: es })}, ${hora}`;
}

/**
 * Tiempo relativo al ahora: "hace 5 minutos", "hace 2 horas", "hace 3 días"
 * (vía `formatDistanceToNow` de date-fns con locale es, igual que hace
 * `muro.tsx`). Útil para timelines/comentarios/notificaciones.
 *
 * Ante una fecha inválida devuelve `''`.
 */
export function hace(iso: string | null | undefined): string {
  const d = aFecha(iso);
  if (!d) return '';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/**
 * Solo la hora: "14:30".
 *
 * Ante una fecha inválida devuelve `''`.
 */
export function hora(iso: string | null | undefined): string {
  const d = aFecha(iso);
  if (!d) return '';
  return format(d, 'HH:mm');
}

/**
 * Día completo, sin hora ni año: "miércoles 3 de septiembre". Para
 * encabezados de sección (agrupar turnos por día, subtítulo de "hoy es...").
 *
 * Ante una fecha inválida devuelve `''`.
 */
export function diaLargo(iso: string | null | undefined): string {
  const d = aFecha(iso);
  if (!d) return '';
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

/**
 * Vencimiento humano para fechas de "próximo vencimiento" (vacunas,
 * desparasitaciones, etc.): "Vence hoy", "Vence mañana", "Vence en 12 días"
 * o, si ya pasó, "Vencida ayer" / "Vencida hace 3 días".
 *
 * Ante una fecha inválida devuelve `''`.
 */
export function vence(iso: string | null | undefined): string {
  const d = aFecha(iso);
  if (!d) return '';
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const dias = Math.round((d.getTime() - hoy.getTime()) / 86_400_000);
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  if (dias > 1) return `Vence en ${dias} días`;
  if (dias === -1) return 'Vencida ayer';
  return `Vencida hace ${Math.abs(dias)} días`;
}

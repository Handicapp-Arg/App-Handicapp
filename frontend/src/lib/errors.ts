/**
 * Extracts a human-friendly error message from an axios/unknown error.
 * Handles NestJS validation errors where `message` may be a string array.
 */
export function getErrorMessage(err: unknown, fallback = 'Ocurrió un error'): string {
  if (!err || typeof err !== 'object') return fallback;

  const response = (err as { response?: { data?: { message?: unknown } } }).response;
  const raw = response?.data?.message;

  if (Array.isArray(raw)) return raw.filter(Boolean).join(' · ') || fallback;
  if (typeof raw === 'string' && raw.trim()) return raw;

  return fallback;
}

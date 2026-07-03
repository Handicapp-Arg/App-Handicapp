import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatMoney, type Currency } from '@/lib/currency';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calcAge(birthDate: string): string {
  const diff = Date.now() - new Date(birthDate + 'T12:00:00').getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  if (years < 1) return 'Menos de 1 año';
  return years === 1 ? '1 año' : `${years} años`;
}

/** @deprecated Usar `formatMoney` de `@/lib/currency`. Alias de compatibilidad. */
export function formatCurrency(amount: number | null | undefined, currency: string = 'ARS'): string {
  return formatMoney(amount, currency as Currency);
}

export function formatDate(
  date: string,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  return new Date(date + 'T12:00:00').toLocaleDateString('es-AR', opts);
}

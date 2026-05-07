export type Currency = 'ARS' | 'USD';

export function formatCurrency(amount: number | null | undefined, currency: Currency = 'ARS'): string {
  if (amount == null) return '';
  const formatted = Number(amount).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === 'USD' ? `U$D ${formatted}` : `$ ${formatted}`;
}

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'ARS', label: '$ ARS' },
  { value: 'USD', label: 'U$D USD' },
];

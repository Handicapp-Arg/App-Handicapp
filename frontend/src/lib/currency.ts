export type Currency = 'ARS' | 'USD';

export function formatAmount(amount: number, currency: Currency = 'ARS'): string {
  if (currency === 'USD') {
    return `USD ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'ARS', label: '$ ARS — Pesos' },
  { value: 'USD', label: 'USD — Dólares' },
];

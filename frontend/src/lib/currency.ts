export type Currency = 'ARS' | 'USD';

/**
 * Formato de moneda canónico de HandicApp.
 *
 * - ARS: `$1.234`   → símbolo `$`, sin espacio, miles con punto (locale es-AR).
 * - USD: `US$1.234` → notación `US$`, sin espacio.
 *
 * Sin decimales salvo que el monto los tenga (ej. `$1.234,50`).
 * Devuelve '' para null/undefined/NaN.
 *
 * IMPORTANTE: esta función y `mobile/lib/currency.ts#formatMoney` DEBEN producir
 * EXACTAMENTE el mismo string para el mismo input. Si cambiás una, cambiá la otra.
 */
export function formatMoney(amount: number | null | undefined, currency: Currency = 'ARS'): string {
  if (amount == null || Number.isNaN(Number(amount))) return '';
  const n = Number(amount);
  const hasDecimals = !Number.isInteger(n);
  const formatted = n.toLocaleString('es-AR', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${currency === 'USD' ? 'US$' : '$'}${formatted}`;
}

/** @deprecated Usar `formatMoney`. Alias de compatibilidad. */
export const formatAmount = formatMoney;

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'ARS', label: '$ ARS — Pesos' },
  { value: 'USD', label: 'US$ USD — Dólares' },
];

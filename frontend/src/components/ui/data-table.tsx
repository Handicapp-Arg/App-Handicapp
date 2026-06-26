'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  /** Render del valor. Si no se pasa, intenta leer `row[key]`. */
  render?: (row: T, index: number) => ReactNode;
  /** Clase aplicada a la celda (controla ancho/alineación). */
  className?: string;
  /** Esconder la columna debajo de este breakpoint. */
  hideBelow?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right' | 'center';
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string | number;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Footer (paginación, etc.). */
  footer?: ReactNode;
  className?: string;
}

const hideClass = (b?: 'sm' | 'md' | 'lg') =>
  b === 'sm' ? 'hidden sm:table-cell' : b === 'md' ? 'hidden md:table-cell' : b === 'lg' ? 'hidden lg:table-cell' : '';

const alignClass = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyState,
  onRowClick,
  loading,
  footer,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-surface-border bg-[var(--surface-card)] shadow-[var(--shadow-card)]', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500',
                    alignClass(c.align),
                    hideClass(c.hideBelow),
                    c.className,
                  )}
                  scope="col"
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`s-${i}`} aria-hidden>
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-4', hideClass(c.hideBelow))}>
                      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-400">
                  {emptyState ?? 'Sin datos para mostrar'}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition',
                    onRowClick && 'cursor-pointer hover:bg-slate-50',
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        'px-4 py-3 text-slate-700 align-middle',
                        alignClass(c.align),
                        hideClass(c.hideBelow),
                        c.className,
                      )}
                    >
                      {c.render
                        ? c.render(row, i)
                        : String((row as Record<string, unknown>)[c.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">{footer}</div>}
    </div>
  );
}

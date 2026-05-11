'use client';

import { type ReactNode } from 'react';
import { ErrorState } from './error-state';
import { EmptyState } from './empty-state';
import { PageLoader } from './skeleton';

/**
 * Forma mínima que esperamos de un resultado de TanStack Query.
 * Mantenemos la firma compatible con el genérico oficial sin importarlo.
 */
interface QueryLike<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch?: () => unknown;
}

interface QueryStateProps<T> {
  query: QueryLike<T>;
  /** Predicado para considerar el resultado "vacío" (default: false). */
  isEmpty?: (data: T) => boolean;
  loading?: ReactNode;
  errorState?: ReactNode;
  emptyState?: ReactNode;
  children: (data: T) => ReactNode;
}

export function QueryState<T>({
  query,
  isEmpty,
  loading,
  errorState,
  emptyState,
  children,
}: QueryStateProps<T>) {
  if (query.isLoading) {
    return <>{loading ?? <PageLoader />}</>;
  }
  if (query.isError) {
    return (
      <>
        {errorState ?? (
          <ErrorState onRetry={query.refetch ? () => query.refetch?.() : undefined} />
        )}
      </>
    );
  }
  if (query.data === undefined) {
    return <>{emptyState ?? <EmptyState title="Sin datos" />}</>;
  }
  if (isEmpty?.(query.data)) {
    return <>{emptyState ?? <EmptyState title="Sin datos" />}</>;
  }
  return <>{children(query.data)}</>;
}

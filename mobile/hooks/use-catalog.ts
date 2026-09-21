import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { CatalogItem } from '../../packages/shared/src';

/**
 * Catálogos editables del backend (`GET /catalog-items?type=...`): las razas y
 * las actividades ("para qué lo tenés": polo, turf, cría...). El móvil todavía
 * no los consumía y por eso el alta de caballo no podía preguntar la actividad
 * aunque el backend ya la aceptara.
 *
 * Son listas cortas y casi inmutables —las siembra el propio servicio y solo un
 * admin las toca—, así que se cachean largo: pedirlas de nuevo en cada apertura
 * del formulario es tráfico al pedo.
 */
function useCatalogItems(type: 'activity' | 'breed') {
  return useQuery<CatalogItem[]>({
    queryKey: ['catalog-items', type],
    queryFn: async () => (await api.get('/catalog-items', { params: { type } })).data,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/** Actividades: "Polo", "Turf", "Equitación", "Cría", "Recreativo". */
export function useActividades() {
  return useCatalogItems('activity');
}

/** Razas. */
export function useRazas() {
  return useCatalogItems('breed');
}

import type { Router } from 'expo-router';

/**
 * Catálogo central de rutas estáticas. Mantener acá evita repetir el cast
 * `as never` en cada `router.push` y deja un único punto donde se documenta
 * el árbol de navegación.
 */
export const Routes = {
  tabsHome:        '/(tabs)',
  authLogin:       '/(auth)/login',
  organizacion:    '/organizacion',
  directorio:      '/directorio',
  contratos:       '/contratos',
  solicitudes:     '/solicitudes',
  superadmin:      '/superadmin',
  invitacion:      (token: string) => `/invitacion/${token}`,
} as const;

/** Wrappers tipados para no esparcir `as never` por la app. */
export const nav = {
  push:    (r: Router, path: string) => r.push(path as never),
  replace: (r: Router, path: string) => r.replace(path as never),
};

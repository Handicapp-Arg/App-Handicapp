import type { Router } from 'expo-router';

/**
 * Catálogo central de rutas estáticas. Mantener acá evita repetir el cast
 * `as never` en cada `router.push` y deja un único punto donde se documenta
 * el árbol de navegación.
 */
export const Routes = {
  tabsHome:            '/(tabs)',
  tabsCaballos:        '/(tabs)/caballos',
  tabsEventos:         '/(tabs)/eventos',
  tabsAgenda:          '/(tabs)/agenda',
  tabsFacturacion:     '/(tabs)/facturacion',
  authLogin:           '/(auth)/login',
  buscar:              '/buscar',
  organizacion:        '/organizacion',
  directorio:          '/directorio',
  contratos:           '/contratos',
  solicitudes:         '/solicitudes',
  notificaciones:      '/notificaciones',
  notificacionesConfig: '/notificaciones-config',
  superadmin:          '/superadmin',
  muro:                '/(tabs)/muro',
  mas:                 '/(tabs)/mas',
  remates:             '/(tabs)/remates',
  remateCrear:         '/remates/crear',
  remate:              (id: string) => `/remates/${id}`,
  invitacion:          (token: string) => `/invitacion/${token}`,
  caballo:             (id: string) => `/(tabs)/caballos/${id}`,
  arbol:               '/arbol',
  padron:              '/padron',
} as const;

/** Wrappers tipados para no esparcir `as never` por la app. */
export const nav = {
  push:    (r: Router, path: string) => r.push(path as never),
  replace: (r: Router, path: string) => r.replace(path as never),
};

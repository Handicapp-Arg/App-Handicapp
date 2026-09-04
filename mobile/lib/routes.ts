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
  eventoNuevo:         '/(tabs)/eventos/nuevo',
  tabsAgenda:          '/(tabs)/agenda',
  tabsFacturacion:     '/(tabs)/facturacion',
  facturacionNueva:    '/(tabs)/facturacion/nueva',
  factura:             (id: string) => `/(tabs)/facturacion/${id}`,
  authLogin:           '/(auth)/login',
  authRegistro:        '/(auth)/registro',
  organizacion:        '/organizacion',
  unirme:              '/unirme',
  directorio:          '/directorio',
  contratos:           '/contratos',
  contratoNuevo:       '/(tabs)/contratos/nuevo',
  contrato:            (id: string) => `/(tabs)/contratos/${id}`,
  contratoFirmar:      (id: string) => `/(tabs)/contratos/${id}/firmar`,
  solicitudes:         '/solicitudes',
  notificaciones:      '/notificaciones',
  notificacionesConfig: '/notificaciones-config',
  notificacionesConfigRol: (rol: string) => `/notificaciones-config/${rol}`,
  superadmin:          '/superadmin',
  muro:                '/(tabs)/muro',
  muroNuevo:           '/(tabs)/muro/nuevo',
  mas:                 '/(tabs)/mas',
  miPlan:              '/(tabs)/mi-plan',
  reportes:            '/(tabs)/reportes',
  remates:             '/(tabs)/remates',
  remateCrear:         '/(tabs)/remates/crear',
  remate:              (id: string) => `/(tabs)/remates/${id}`,
  invitacion:          (token: string) => `/invitacion/${token}`,
  caballo:             (id: string) => `/(tabs)/caballos/${id}`,
  vincularPadron:      (id: string) => `/(tabs)/caballos/${id}/vincular-padron`,
  padron:              '/padron',
  padronRegistro:      (id: string) => `/padron/${id}`,
  supervision:         '/supervision',
} as const;

/** Wrappers tipados para no esparcir `as never` por la app. */
export const nav = {
  push:    (r: Router, path: string) => r.push(path as never),
  replace: (r: Router, path: string) => r.replace(path as never),
};

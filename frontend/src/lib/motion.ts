/**
 * Sistema de motion central. Tres duraciones, tres easings.
 * Usar SIEMPRE estos valores en `transition`, animations y framer; nunca inventar
 * números nuevos en un componente puntual.
 */
export const duration = {
  fast: 120,  // hover, focus, micro-feedback
  base: 200,  // estados, abrir/cerrar componentes ligeros
  slow: 320,  // modales, transiciones de página
} as const;

export const easing = {
  /** Salida suave — bueno para entrada de elementos */
  outQuart:   'cubic-bezier(0.25, 1, 0.5, 1)',
  /** Más expresivo — drops y modales */
  outExpo:    'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Entrada + salida balanceada — transiciones entre estados */
  inOutCirc:  'cubic-bezier(0.85, 0, 0.15, 1)',
} as const;

/** Convenience: helpers de transition para usar en `style={{ transition: ... }}`. */
export const transition = {
  fast:  `all ${duration.fast}ms ${easing.outQuart}`,
  base:  `all ${duration.base}ms ${easing.outQuart}`,
  slow:  `all ${duration.slow}ms ${easing.outExpo}`,
} as const;

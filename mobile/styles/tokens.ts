/**
 * Design tokens — fuente única de verdad para espaciado, tipografía y radios.
 * Usar siempre estos valores en lugar de números hardcodeados.
 */

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const;

/**
 * Escala tipográfica alineada a iOS: el cuerpo de texto vive en 16–17, no en
 * 13–15 como en escritorio. El teléfono se lee a una mano y en movimiento, así
 * que subir la base es lo que saca a la app de la sensación "apretada".
 */
export const text = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 17,
  lg: 22,
  xl: 26,
  '2xl': 30,
  display: 34,
} as const;

/** Alturas táctiles. 44 es el mínimo de Apple; 56 es la medida cómoda. */
export const touch = {
  min: 44,
  field: 56,
  button: 56,
} as const;

/**
 * La escala numérica queda para casos sueltos; las piezas usan los radios
 * SEMÁNTICOS de abajo. El radio grande es medio lenguaje de la app 2026: una
 * tarjeta en 12 se lee vieja aunque todo lo demás esté bien.
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 999,

  /** Tarjetas y hojas. */
  card: 22,
  /** Campos de formulario y botones secundarios. */
  field: 18,
  /** Botón principal. */
  button: 20,
  /** Miniaturas, avatares cuadrados e iconos en cajita. */
  thumb: 16,
  /** Hojas que suben desde abajo. */
  sheet: 28,
} as const;

/**
 * Sombras largas y suaves, no cortas y duras: la tarjeta tiene que flotar sobre
 * el crema, no llevar un contorno gris. El color no es negro puro sino la tinta
 * de la marca, para que la sombra no ensucie el fondo cálido.
 */
const INK = '#15140f';

export const shadow = {
  /** Apoyada: filas y chips. */
  sm: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  /** Tarjeta normal. */
  md: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  /** Tarjeta destacada y hojas. */
  lg: {
    shadowColor: INK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 22,
    elevation: 8,
  },
} as const;

/** Sombra teñida del botón principal: lo despega sin agregarle borde. */
export const brandShadow = (brand: string) => ({
  shadowColor: brand,
  shadowOffset: { width: 0, height: 6 },
  // Bajo a propósito: la sombra tiene que dar apoyo, no brillo. Con más
  // opacidad el verde rebota sobre el fondo y el botón se lee como un neón,
  // que es justo lo que hace ver una app hecha con plantilla.
  shadowOpacity: 0.14,
  shadowRadius: 14,
  elevation: 4,
});

export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/**
 * Velo oscuro que se tiende sobre una foto para que el texto encima se lea.
 *
 * No vive en el theme y no cambia con el modo claro/oscuro: abajo hay una
 * imagen, no una superficie de la app, y una foto es igual de clara de noche.
 * Va con `LinearGradient` y no con un color plano porque apagar la foto entera
 * para leer dos líneas es desperdiciarla.
 */
export const photoScrim = ['transparent', 'rgba(21,20,15,0.2)', 'rgba(21,20,15,0.78)'] as const;

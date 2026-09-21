/**
 * Sistema de movimiento. Cuatro duraciones, tres curvas y la entrada escalonada
 * de las listas. Usar SIEMPRE estos valores en `withTiming` y en los `entering`
 * de Reanimated: el movimiento explica de dónde viene cada cosa, nunca decora.
 */

// El Easing viene de Reanimated, no de react-native: `withTiming` corre en el
// hilo de UI y rechaza cualquier curva que no sea un worklet. Ojo si alguna vez
// se usa con el `Animated` clásico: esto devuelve una fábrica, no una función.
import { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

/**
 * Las cuatro duraciones del sistema. La regla del lienzo: todo ENTRA en 280 ms
 * y SALE en 200. Sale más rápido de lo que entra porque esperar a que algo se
 * vaya es tiempo muerto; esperar a que algo llegue es contexto.
 */
export const duration = {
  /** Respuesta al dedo: hundir un botón, marcar un chip. */
  fast: 120,
  /** Salida: cerrar una hoja, apagar un aviso, volver un botón a su lugar. */
  base: 200,
  /** Entrada: una hoja que sube, una fila que aparece, un anillo que se dibuja. */
  enter: 280,
  slow: 320,
} as const;

/** Bezier matchea cubic-bezier(x1, y1, x2, y2) usado en CSS web. */
export const easing = {
  outQuart:  Easing.bezier(0.25, 1, 0.5, 1),
  outExpo:   Easing.bezier(0.16, 1, 0.3, 1),
  inOutCirc: Easing.bezier(0.85, 0, 0.15, 1),
} as const;

/** Escalón entre filas y tope de filas que escalonan. */
const PASO_MS = 45;
const TOPE_FILAS = 8;

/**
 * Entrada escalonada para bloques FIJOS de una pantalla: las secciones de la
 * ficha, las filas de un menú, las tarjetas de un formulario. Cada una arranca
 * 45 ms después de la anterior, con tope a las ocho.
 *
 * ⚠️ NUNCA dentro del `renderItem` de una FlatList ni de ninguna lista
 * virtualizada. La lista destruye y recrea sus celdas al scrollear, así que la
 * animación se vuelve a disparar sobre vistas recicladas: en vez de una entrada
 * elegante se acumulan decenas de animaciones y la lista da tirones justo
 * mientras el dedo la arrastra. Para una lista, animá el contenedor con
 * `entradaLista()` y dejá las celdas quietas.
 */
export function entradaFila(index: number) {
  return FadeInDown
    .duration(duration.enter)
    .easing(easing.outQuart.factory())
    .delay(Math.min(index, TOPE_FILAS) * PASO_MS);
}

/**
 * Entrada de una lista completa: entra el conjunto, no cada fila.
 *
 * Se usa en el contenedor de una FlatList. Sin desplazamiento vertical a
 * propósito: la pantalla ya está entrando desde la derecha con la transición
 * del stack, y sumarle un movimiento hacia arriba a la lista hace que el
 * contenido parezca corregirse solo después de llegar.
 */
export function entradaLista() {
  return FadeIn.duration(duration.enter).easing(easing.outQuart.factory());
}

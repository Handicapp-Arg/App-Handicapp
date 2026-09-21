/**
 * Tipografía por defecto de toda la app, resuelta UNA sola vez.
 *
 * POR QUÉ existe este archivo
 * ---------------------------
 * `styles/fonts.ts` carga Inter, pero React Native NO tiene una "fuente de la
 * app": si un estilo no declara `fontFamily`, cada plataforma usa la suya (San
 * Francisco en iOS, Roboto en Android). Como casi ninguna pantalla declaraba la
 * familia y solo ponía `fontWeight`, en Android convivían títulos en Inter (los
 * pocos que sí la declaraban) con títulos en Roboto. Se veía como dos apps
 * distintas pegadas.
 *
 * Arreglarlo pantalla por pantalla es imposible de sostener: cualquier `<Text>`
 * nuevo vuelve a caer en Roboto. Así que se resuelve en la raíz.
 *
 * CÓMO
 * ----
 * `react-native` expone `Text` y `TextInput` como *getters* de su objeto de
 * exports, y Babel compila cada `<Text>` a un acceso a esa propiedad EN CADA
 * RENDER. Redefiniendo el getter con `Object.defineProperty` conseguimos que
 * todo `<Text>` de la app —incluido el que se escriba mañana— pase por un
 * envoltorio que le pone la familia correcta. No hace falta tocar ni un import.
 *
 * (El patrón clásico de `Text.render = ...` ya no sirve: desde RN 0.81 / React
 * 19 `Text` es una función común, sin `forwardRef`, así que no tiene `.render`.
 * `defaultProps` tampoco: React 19 lo ignora en componentes de función.)
 *
 * EL PESO
 * -------
 * Inter viene en cinco archivos separados y cada uno se registra con SU propio
 * nombre de familia (`Inter_700Bold`). Fijar `fontFamily: 'Inter_400Regular'` y
 * dejar que `fontWeight: '700'` haga la negrita da negrita sintética (falsa) en
 * Android. Por eso el envoltorio traduce el peso declarado a la variante real y
 * deja el `fontWeight` tal cual: familia + peso coincidentes es la combinación
 * que ya usaba `login.tsx`, la pantalla de referencia aprobada.
 */
import { createContext, createElement, useContext, type Context } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { fontFamily } from './fonts';

/** Peso declarado → variante de Inter que hay que usar de verdad. */
const VARIANTE: Record<string, string> = {
  '100': fontFamily.regular,
  '200': fontFamily.regular,
  '300': fontFamily.regular,
  '400': fontFamily.regular,
  normal: fontFamily.regular,
  '500': fontFamily.medium,
  '600': fontFamily.semibold,
  '700': fontFamily.bold,
  bold: fontFamily.bold,
  '800': fontFamily.extrabold,
  '900': fontFamily.extrabold,
};

/**
 * Un objeto de estilo por variante, creado una vez. Reusar la misma referencia
 * evita generar basura en cada render de cada texto de la app.
 */
const ESTILO_FAMILIA: Record<string, TextStyle> = {};
for (const familia of Object.values(fontFamily)) {
  ESTILO_FAMILIA[familia] = { fontFamily: familia };
}

/**
 * Devuelve el estilo de familia que hay que agregar, o `null` si no hay nada
 * que hacer.
 *
 * @param anidado true si el `<Text>` vive DENTRO de otro `<Text>`. En ese caso,
 *   si no declara peso propio, no se toca: tiene que seguir heredando la
 *   tipografía del padre (si no, un `<Text>` suelto adentro de un título en
 *   negrita volvería a peso normal).
 */
function resolver(style: unknown, anidado: boolean): TextStyle | null {
  const plano = StyleSheet.flatten(style as TextStyle | undefined) as TextStyle | undefined;
  // Quien declara la familia a mano manda: no se le pisa.
  if (plano?.fontFamily) return null;
  const peso = plano?.fontWeight;
  if (anidado && peso == null) return null;
  return ESTILO_FAMILIA[VARIANTE[String(peso ?? '400')] ?? fontFamily.regular];
}

/**
 * Memoria de lo ya resuelto para los estilos REGISTRADOS (los que
 * `StyleSheet.create` convierte en un número). Esto corre en cada render de
 * cada texto de la app, así que evitar el `flatten` en el caso común importa:
 * un estilo registrado siempre da el mismo resultado.
 *
 * Los estilos en array (`style={[a, b]}`) no se cachean: son una referencia
 * nueva en cada render y guardarlos sería una fuga de memoria que crece sola.
 */
const YA_RESUELTO = new Map<string, TextStyle | null>();

function familiaPara(style: unknown, anidado: boolean): TextStyle | null {
  // Sin estilo no hay nada que mirar: va la variante normal.
  if (style == null) return anidado ? null : ESTILO_FAMILIA[fontFamily.regular];

  if (typeof style === 'number') {
    const clave = anidado ? `a${style}` : `s${style}`;
    const guardado = YA_RESUELTO.get(clave);
    if (guardado !== undefined) return guardado;
    const resuelto = resolver(style, anidado);
    YA_RESUELTO.set(clave, resuelto);
    return resuelto;
  }

  return resolver(style, anidado);
}

/**
 * Tope de escalado tipográfico. La app acompaña el tamaño de letra del sistema,
 * pero con un límite para que los tamaños extremos no rompan filas y botones de
 * alto fijo. Vivía en `Text.defaultProps`, que React 19 ya no aplica.
 */
const MAX_ESCALA = 1.35;

type PropsTexto = { style?: unknown; maxFontSizeMultiplier?: number | null };

/** Contexto "nunca anidado": el de reserva y el que usa `TextInput`. */
const SIN_ANCESTRO = createContext(false);

function envolver(
  Original: React.ComponentType<PropsTexto>,
  AncestroTexto: Context<boolean>,
) {
  function ConInter(props: PropsTexto) {
    const anidado = useContext(AncestroTexto);
    const extra = familiaPara(props.style, anidado);
    return createElement(Original, {
      maxFontSizeMultiplier: MAX_ESCALA,
      ...props,
      style: extra ? [props.style, extra] : props.style,
    });
  }
  // Copia los estáticos del original —`TextInput.State`, `displayName`— porque
  // hay código de RN y de librerías que los usa, y porque así el árbol de
  // componentes sigue diciendo "Text" y no un nombre inventado.
  return Object.assign(ConInter, Original);
}

let aplicada = false;

/**
 * Se llama una sola vez, lo más arriba posible (`app/_layout.tsx`).
 * Es idempotente y nunca debe tirar: si algún día RN cambia la forma de sus
 * exports, la app tiene que seguir arrancando (con la tipografía vieja).
 */
export function aplicarFuenteGlobal(): void {
  if (aplicada) return;
  aplicada = true;
  try {
    // `require` a propósito: `import * as RN` pasa por el interop de Babel, que
    // devuelve una COPIA del objeto de exports y parchearla no serviría de nada.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const RN = require('react-native') as Record<string, unknown>;
    // Si algún día RN dejara de exponerlo, el de reserva hace que todo cuente
    // como "no anidado": peor caso, un texto anidado sin estilo propio se
    // dibuja en peso normal en vez de heredar la negrita del padre.
    const AncestroTexto = (RN.unstable_TextAncestorContext as Context<boolean> | undefined) ?? SIN_ANCESTRO;

    for (const nombre of ['Text', 'TextInput'] as const) {
      const Original = RN[nombre] as React.ComponentType<PropsTexto> | undefined;
      if (typeof Original !== 'function') continue;
      const Envuelto = envolver(Original, nombre === 'Text' ? AncestroTexto : SIN_ANCESTRO);
      Object.defineProperty(RN, nombre, {
        configurable: true,
        enumerable: true,
        get: () => Envuelto,
      });
    }
  } catch (e) {
    if (__DEV__) console.warn('[fuente-global] no se pudo fijar Inter por defecto:', e);
  }
}

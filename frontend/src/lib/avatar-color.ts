/**
 * Color de avatar (iniciales) — determinístico por usuario.
 *
 * Cada persona recibe un color consistente derivado de su nombre/id, de una
 * paleta ACOTADA y CÁLIDA (tonos tierra/equinos, coherentes con la identidad).
 * Sin selector: cero fricción, todos se distinguen, nada de arcoíris.
 *
 * Mismo algoritmo y paleta que el móvil (`mobile/lib/avatar-color.ts`) → el
 * mismo usuario tiene el MISMO color en web y en la app.
 *
 * Prioridad de render en los componentes: foto → (color elegido, futuro) → hash.
 * El cuero de marca NO se usa acá: se reserva para la UI (botones, acentos).
 */

/** Paleta tierra/equina — pares [from, to] para el gradiente del avatar. */
export const AVATAR_PALETTE: ReadonlyArray<readonly [string, string]> = [
  ['#bd8a4d', '#7f5628'], // cuero
  ['#c2683f', '#9a4a2a'], // terracota
  ['#c4922a', '#9a7320'], // ocre
  ['#7d8242', '#566030'], // oliva
  ['#a8503a', '#7d3a2a'], // herrumbre
  ['#8a7d6b', '#5a5044'], // piedra
  ['#8a4250', '#65303a'], // vino
  ['#5f7355', '#45543e'], // musgo
] as const;

/** Hash estable (FNV-like) de un string → entero sin signo. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Devuelve los dos tonos del avatar para un seed (nombre o id). */
export function avatarColors(seed: string | null | undefined): { from: string; to: string } {
  const s = (seed ?? '').trim() || '?';
  const [from, to] = AVATAR_PALETTE[hashSeed(s) % AVATAR_PALETTE.length];
  return { from, to };
}

/** Gradiente CSS listo para `style={{ backgroundImage }}`. */
export function avatarGradient(seed: string | null | undefined): string {
  const { from, to } = avatarColors(seed);
  return `linear-gradient(135deg, ${from}, ${to})`;
}

/** Iniciales (hasta 2) a partir de un nombre. */
export function initialsOf(name: string | null | undefined): string {
  return (name ?? '')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

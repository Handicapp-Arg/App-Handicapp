/**
 * Color de avatar (iniciales) — determinístico por usuario.
 *
 * Mismo algoritmo y paleta que la web (`frontend/src/lib/avatar-color.ts`) → el
 * mismo usuario tiene el MISMO color en web y en la app.
 *
 * React Native no soporta gradientes CSS por estilo, así que además del par
 * [from, to] exponemos `avatarColor`, un color SÓLIDO (el tono `to`, el más
 * oscuro, que contrasta con texto blanco).
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

/** Color sólido representativo (tono oscuro `to`) para `backgroundColor`. */
export function avatarColor(seed: string | null | undefined): string {
  return avatarColors(seed).to;
}

/** Iniciales (hasta 2) a partir de un nombre. */
export function initialsOf(name: string | null | undefined): string {
  return (
    (name ?? '')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

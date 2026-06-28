/**
 * Color de avatar (iniciales) — elegible por el usuario, con fallback automático.
 *
 * Prioridad de color: color ELEGIDO por el usuario (`avatar_color`) → si no eligió,
 * color determinístico por nombre (hash). Y en los componentes: foto → este color.
 *
 * Paleta ACOTADA y CÁLIDA (tonos tierra/equinos, coherentes con la identidad).
 * Cada tono tiene un `id` ESTABLE (se guarda en el back, no el índice) para poder
 * reordenar la paleta sin romper las elecciones existentes.
 *
 * Mismo algoritmo, paleta e ids que el móvil (`mobile/lib/avatar-color.ts`) y que
 * el back (`AVATAR_COLOR_IDS` en update-profile.dto) → el mismo usuario tiene el
 * MISMO color en web y en la app. El cuero de marca NO se usa acá (se reserva
 * para la UI: botones, acentos).
 */

export const AVATAR_PALETTE = [
  { id: 'cuero',     from: '#bd8a4d', to: '#7f5628' },
  { id: 'terracota', from: '#c2683f', to: '#9a4a2a' },
  { id: 'ocre',      from: '#c4922a', to: '#9a7320' },
  { id: 'oliva',     from: '#7d8242', to: '#566030' },
  { id: 'herrumbre', from: '#a8503a', to: '#7d3a2a' },
  { id: 'piedra',    from: '#8a7d6b', to: '#5a5044' },
  { id: 'vino',      from: '#8a4250', to: '#65303a' },
  { id: 'musgo',     from: '#5f7355', to: '#45543e' },
] as const;

export type AvatarColorId = (typeof AVATAR_PALETTE)[number]['id'];

/** Hash estable de un string → entero sin signo. */
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Devuelve los dos tonos del avatar.
 * @param seed    nombre (o id) del usuario, para el color automático
 * @param colorId tono elegido por el usuario (si lo eligió); tiene prioridad
 */
export function avatarColors(
  seed: string | null | undefined,
  colorId?: string | null,
): { from: string; to: string } {
  const chosen = colorId ? AVATAR_PALETTE.find((p) => p.id === colorId) : undefined;
  const s = (seed ?? '').trim() || '?';
  const tone = chosen ?? AVATAR_PALETTE[hashSeed(s) % AVATAR_PALETTE.length];
  return { from: tone.from, to: tone.to };
}

/** Gradiente CSS listo para `style={{ backgroundImage }}`. */
export function avatarGradient(
  seed: string | null | undefined,
  colorId?: string | null,
): string {
  const { from, to } = avatarColors(seed, colorId);
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

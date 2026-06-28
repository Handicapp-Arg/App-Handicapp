/**
 * Color de avatar (iniciales) — elegible por el usuario, con fallback automático.
 * Gemelo de `frontend/src/lib/avatar-color.ts`: misma paleta, mismos ids y mismo
 * hash → el mismo usuario tiene el MISMO color en web y en la app.
 *
 * Prioridad: color ELEGIDO (`avatar_color`) → si no eligió, hash del nombre.
 * Los ids son estables y coinciden con el back (AVATAR_COLOR_IDS).
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

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Devuelve los dos tonos (degradé) para un usuario. `colorId` (elegido) tiene prioridad. */
export function avatarColors(
  seed: string | null | undefined,
  colorId?: string | null,
): { from: string; to: string } {
  const chosen = colorId ? AVATAR_PALETTE.find((p) => p.id === colorId) : undefined;
  const s = (seed ?? '').trim() || '?';
  const tone = chosen ?? AVATAR_PALETTE[hashSeed(s) % AVATAR_PALETTE.length];
  return { from: tone.from, to: tone.to };
}

/** Color SÓLIDO (el tono oscuro `to`, contrasta con texto blanco) para `backgroundColor`. */
export function avatarColor(
  seed: string | null | undefined,
  colorId?: string | null,
): string {
  return avatarColors(seed, colorId).to;
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

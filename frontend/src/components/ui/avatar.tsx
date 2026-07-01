import { cn } from '@/lib/cn';
import { avatarGradient, initialsOf } from '@/lib/avatar-color';

/**
 * Avatar unificado de HandicApp — identidad visual consistente de personas y
 * organizaciones en toda la web.
 *
 * - Con `avatarUrl` → muestra la foto (redonda, object-cover).
 * - Sin foto → iniciales (1-2 letras) en blanco sobre el color del usuario.
 *   Si no hay `avatarColor`, se deriva un tono determinístico del nombre
 *   (paleta cálida dark-safe compartida con el móvil y el back — ver
 *   `@/lib/avatar-color`).
 *
 * Mismo componente en header, muro, perfil, ficha de caballo, directorio, etc.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'rounded';

const SIZE: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const SHAPE: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-2xl',
};

interface AvatarProps {
  /** Nombre para las iniciales y el color determinístico de fallback. */
  name?: string | null;
  /** Foto de perfil. Si existe, tiene prioridad sobre las iniciales. */
  avatarUrl?: string | null;
  /** Tono elegido por el usuario (id de la paleta). Si no, se deriva del nombre. */
  avatarColor?: string | null;
  size?: AvatarSize;
  shape?: AvatarShape;
  /** Anillo sutil del color de la superficie (para superponer sobre banners). */
  ring?: boolean;
  className?: string;
  title?: string;
}

export function Avatar({
  name,
  avatarUrl,
  avatarColor,
  size = 'md',
  shape = 'circle',
  ring = false,
  className,
  title,
}: AvatarProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-bold uppercase leading-none text-white shadow-sm',
        SIZE[size],
        SHAPE[shape],
        ring && 'ring-4 ring-[var(--surface-card)]',
        className,
      )}
      style={avatarUrl ? undefined : { backgroundImage: avatarGradient(name, avatarColor) }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

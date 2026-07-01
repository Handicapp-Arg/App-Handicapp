import { BadgeCheck, ShieldCheck } from 'lucide-react';
import type { User } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Badges de verificación (solo visual).
 *
 * - `VetVerifiedBadge`: check azul estilo redes, va JUNTO AL NOMBRE de un
 *   veterinario con matrícula aprobada.
 * - `HorseVerifiedBadge`: badge verde para caballos registrados en padrón
 *   (disparado por `horse_record_id`).
 */

/* ─── Helpers ─── */

/** True si el usuario es veterinario con matrícula aprobada. */
export function isVetVerified(
  user?: Pick<User, 'role' | 'vet_license_status'> | null,
): boolean {
  return user?.role === 'veterinario' && user?.vet_license_status === 'approved';
}

/* ─── Vet verificado ─── */

const VET_SIZE = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
} as const;

interface VetVerifiedBadgeProps {
  /** `sm` para inline junto a nombres, `md` para el header de perfil. */
  size?: keyof typeof VET_SIZE;
  className?: string;
  title?: string;
}

/**
 * Check azul de "veterinario verificado", pensado para ir junto al nombre.
 * Dark-safe: navy/azul info que se aclara en dark.
 */
export function VetVerifiedBadge({
  size = 'sm',
  className,
  title = 'Veterinario con matrícula verificada',
}: VetVerifiedBadgeProps) {
  return (
    <span title={title} aria-label={title} className="inline-flex shrink-0 items-center">
      <BadgeCheck
        strokeWidth={2.4}
        className={cn(
          'text-[#1d4ed8] dark:text-blue-400',
          VET_SIZE[size],
          className,
        )}
      />
    </span>
  );
}

/* ─── Caballo verificado ─── */

const HORSE_SIZE = {
  sm: { icon: 'h-3 w-3', text: 'text-[10px]', pad: 'gap-1 px-2 py-1' },
  md: { icon: 'h-3.5 w-3.5', text: 'text-[11px]', pad: 'gap-1 px-2.5 py-1' },
} as const;

interface HorseVerifiedBadgeProps {
  /**
   * - `soft`: pill claro (fondo emerald tenue) para superficies claras.
   * - `solid`: emerald sólido con texto blanco, para overlays sobre imágenes.
   */
  variant?: 'soft' | 'solid';
  size?: keyof typeof HORSE_SIZE;
  /** Texto opcional. Si se omite, muestra solo el ícono. */
  label?: string;
  className?: string;
}

/**
 * Badge verde de "caballo verificado en padrón" (disparado por `horse_record_id`).
 * Unifica los spans inline que existían en las vistas de caballos.
 */
export function HorseVerifiedBadge({
  variant = 'soft',
  size = 'md',
  label = 'Verificado en padrón',
  className,
}: HorseVerifiedBadgeProps) {
  const s = HORSE_SIZE[size];
  const skin =
    variant === 'solid'
      ? 'bg-emerald-500/95 text-white shadow backdrop-blur-sm'
      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25';
  return (
    <span
      title={label}
      className={cn(
        'inline-flex items-center rounded-lg font-bold',
        s.pad,
        s.text,
        skin,
        className,
      )}
    >
      <ShieldCheck className={s.icon} strokeWidth={2.4} />
      {label && <span>{label}</span>}
    </span>
  );
}

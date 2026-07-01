import type { ComponentType } from 'react';
import { Crown, Building2, Stethoscope, ShieldCheck, ClipboardList, Wrench } from 'lucide-react';
import { HorseHead } from '@/components/icons/equine';
import { cn } from '@/lib/cn';

/**
 * Chip de rol unificado — color + ícono coherentes por rol, en toda la web.
 * Cubre los roles de plataforma (propietario, establecimiento, veterinario,
 * admin) y los roles operativos de organización (encargado, jinete, peón, etc.).
 * Tints translúcidos con variantes `dark:` → dark-safe.
 */

type IconType = ComponentType<{ size?: number; className?: string }>;

interface RoleStyle {
  label: string;
  cls: string; // bg + text + ring (light + dark)
  Icon: IconType;
}

const ROLES: Record<string, RoleStyle> = {
  propietario: {
    label: 'Propietario',
    Icon: Crown,
    cls: 'bg-clay-50 text-clay-700 ring-clay-100 dark:bg-clay-500/15 dark:text-clay-300 dark:ring-clay-500/25',
  },
  establecimiento: {
    label: 'Establecimiento',
    Icon: Building2,
    cls: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/25',
  },
  veterinario: {
    label: 'Veterinario',
    Icon: Stethoscope,
    cls: 'bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/25',
  },
  admin: {
    label: 'Admin',
    Icon: ShieldCheck,
    cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25',
  },
  encargado: {
    label: 'Encargado',
    Icon: ClipboardList,
    cls: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25',
  },
  jinete: {
    label: 'Jinete',
    Icon: HorseHead,
    cls: 'bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25',
  },
  peon: {
    label: 'Peón',
    Icon: Wrench,
    cls: 'bg-stone-100 text-stone-700 ring-stone-200 dark:bg-stone-500/15 dark:text-stone-300 dark:ring-stone-500/25',
  },
};

// Alias de roles de organización → mismo estilo que su equivalente.
const ALIASES: Record<string, string> = {
  vet: 'veterinario',
  staff: 'encargado',
  owner_role: 'propietario',
};

function resolveRole(role: string): RoleStyle {
  const key = ALIASES[role] ?? role;
  return (
    ROLES[key] ?? {
      label: role.charAt(0).toUpperCase() + role.slice(1),
      Icon: ShieldCheck,
      cls: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25',
    }
  );
}

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
  /** Sobrescribe el texto del chip (ej. "Dueño" en organización). */
  label?: string;
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({ role, size = 'md', label, showIcon = true, className }: RoleBadgeProps) {
  const r = resolveRole(role);
  const Icon = r.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        r.cls,
        className,
      )}
    >
      {showIcon && <Icon size={size === 'sm' ? 12 : 14} />}
      {label ?? r.label}
    </span>
  );
}

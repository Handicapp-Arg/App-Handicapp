'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/lib/theme-context';
import { cn } from '@/lib/cn';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light',  label: 'Claro',    icon: Sun },
  { value: 'dark',   label: 'Oscuro',   icon: Moon },
  { value: 'system', label: 'Sistema',  icon: Monitor },
];

/** Segmented control para elegir light / dark / system. Compacto, accesible. */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Tema de la interfaz"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-100/80 p-0.5',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(value)}
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full transition',
              active
                ? 'bg-[var(--surface-card)] text-gray-900 shadow-sm ring-1 ring-gray-200'
                : 'text-gray-400 hover:text-gray-700',
            )}
            aria-label={label}
            title={label}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

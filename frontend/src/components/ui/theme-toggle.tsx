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
        'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 p-0.5',
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
              'inline-flex h-7 w-7 items-center justify-center rounded-full transition',
              active
                ? 'bg-white text-navy-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-400 hover:text-slate-700',
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

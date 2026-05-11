'use client';

import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...rest }, ref) => {
    const generated = useId();
    const selectId = id ?? generated;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none rounded-xl border bg-slate-50 px-4 py-2.5 pr-9 text-sm text-slate-900 transition',
              'focus:border-navy-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/10',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-danger-500/40 focus:border-danger-500 focus:ring-danger-500/10'
                : 'border-slate-200',
              className,
            )}
            aria-invalid={!!error}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
            strokeWidth={2}
          />
        </div>
        {error && (
          <p className="text-xs text-danger-700" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';

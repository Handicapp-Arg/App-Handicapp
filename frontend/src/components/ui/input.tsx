'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, className, id, ...props }, ref) => {
    const generated = useId();
    const inputId = id ?? generated;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error || undefined}
            aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
            className={cn(
              'w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition',
              'focus:bg-white focus:outline-none focus:ring-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-danger-500/40 focus:border-danger-500 focus:ring-danger-500/10'
                : 'border-slate-200 focus:border-clay-500 focus:ring-clay-500/10',
              iconLeft && 'pl-10',
              className,
            )}
            {...props}
          />
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-danger-700" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

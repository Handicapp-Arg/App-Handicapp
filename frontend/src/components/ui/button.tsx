'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './skeleton';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-clay-500 text-white shadow-sm hover:bg-clay-600 active:scale-[0.98] disabled:bg-clay-500/50',
  secondary:
    'bg-[var(--surface-card)] text-clay-700 border border-clay-200 hover:bg-clay-50 hover:border-clay-300 active:scale-[0.98]',
  ghost:
    'bg-transparent text-clay-700 hover:bg-clay-50 active:scale-[0.98]',
  outline:
    'bg-transparent text-clay-700 border border-clay-500 hover:bg-clay-50 active:scale-[0.98]',
  danger:
    'bg-danger-500 text-white shadow-sm hover:bg-danger-700 active:scale-[0.98] disabled:bg-danger-500/50',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      iconLeft,
      iconRight,
      fullWidth,
      disabled,
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold tracking-tight transition-all',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay-500 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" color={variant === 'primary' || variant === 'danger' ? 'white' : 'primary'} />
      ) : (
        iconLeft && <span aria-hidden className="shrink-0">{iconLeft}</span>
      )}
      {children}
      {!loading && iconRight && <span aria-hidden className="shrink-0">{iconRight}</span>}
    </button>
  ),
);
Button.displayName = 'Button';

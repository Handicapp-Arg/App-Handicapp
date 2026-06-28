import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { padded?: boolean }>(
  ({ className, padded = true, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-surface-border bg-[var(--surface-card)] shadow-[var(--shadow-card)]',
        padded && 'p-5',
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = 'Card';

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('font-display text-base font-semibold tracking-tight text-gray-900', className)}
      {...rest}
    />
  );
}

export function CardDescription({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-sm text-slate-500', className)} {...rest} />;
}

export function CardContent({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-sm text-slate-700', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4', className)}
      {...rest}
    />
  );
}

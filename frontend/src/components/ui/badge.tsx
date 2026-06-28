import { cn } from '@/lib/cn';

export type BadgeTone = 'navy' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'gold';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

const TONES: Record<BadgeTone, { bg: string; text: string; ring: string; dot: string }> = {
  navy:    { bg: 'bg-clay-50',    text: 'text-[var(--color-primary)]', ring: 'ring-clay-500/25', dot: 'bg-clay-500' },
  brand:   { bg: 'bg-clay-50',    text: 'text-[var(--color-primary)]', ring: 'ring-clay-500/25', dot: 'bg-clay-500' },
  success: { bg: 'bg-success-50', text: 'text-success-700', ring: 'ring-success-500/30', dot: 'bg-success-500' },
  warning: { bg: 'bg-warning-50', text: 'text-warning-700', ring: 'ring-warning-500/30', dot: 'bg-warning-500' },
  danger:  { bg: 'bg-danger-50',  text: 'text-danger-700',  ring: 'ring-danger-500/30',  dot: 'bg-danger-500' },
  info:    { bg: 'bg-info-50',    text: 'text-info-500',    ring: 'ring-info-500/30',    dot: 'bg-info-500' },
  neutral: { bg: 'bg-slate-100',  text: 'text-slate-700',   ring: 'ring-slate-200',      dot: 'bg-slate-500' },
  gold:    { bg: 'bg-gold-50',    text: 'text-gold-600',    ring: 'ring-gold-500/30',    dot: 'bg-gold-500' },
};

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  const t = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        t.bg,
        t.text,
        t.ring,
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: 'blue' | 'green' | 'purple' | 'amber' | 'navy';
  sub?: string;
}

const accentMap = {
  navy:   { bg: 'var(--color-primary)', text: '#ffffff', sub: 'rgba(255,255,255,0.55)', icon: 'rgba(255,255,255,0.15)', label: 'rgba(255,255,255,0.5)', border: 'transparent' },
  blue:   { bg: 'var(--color-blue-50)', text: '#1e3a8a', sub: '#3b82f6', icon: 'var(--color-blue-200)', label: '#60a5fa', border: 'var(--color-blue-200)' },
  green:  { bg: 'var(--color-green-50)', text: '#14532d', sub: '#16a34a', icon: 'var(--color-green-200)', label: '#4ade80', border: 'var(--color-green-200)' },
  purple: { bg: '#faf5ff', text: '#581c87', sub: '#9333ea', icon: '#e9d5ff', label: '#c084fc', border: '#e9d5ff' },
  amber:  { bg: 'var(--color-amber-50)', text: '#78350f', sub: '#d97706', icon: 'var(--color-amber-200)', label: '#fbbf24', border: 'var(--color-amber-200)' },
};

export function StatCard({ label, value, icon, accent, sub }: StatCardProps) {
  const a = accent ? accentMap[accent] : null;

  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        borderColor: a ? a.border : 'var(--surface-card-border)',
        backgroundColor: a ? a.bg : 'var(--surface-card)',
        boxShadow: accent === 'navy'
          ? '0 4px 14px -2px rgb(15 31 61 / 0.35)'
          : 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1.5">
          <p
            className="text-[10.5px] font-bold uppercase tracking-[0.07em]"
            style={{ color: a ? a.label : 'var(--color-bark-400)' }}
          >
            {label}
          </p>
          <p
            className="text-[2rem] font-bold tracking-[-0.03em] leading-none"
            style={{ color: a ? a.text : 'var(--foreground)' }}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs font-medium" style={{ color: a ? a.sub : 'var(--color-bark-400)' }}>
              {sub}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: a ? a.icon : 'var(--color-gray-100)', color: a ? a.text : 'var(--color-bark-400)' }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: 'blue' | 'green' | 'purple' | 'amber' | 'navy';
  sub?: string;
}

const accentMap = {
  navy:   { bg: '#0f1f3d', text: '#ffffff', sub: 'rgba(255,255,255,0.55)', icon: 'rgba(255,255,255,0.15)', label: 'rgba(255,255,255,0.5)', border: 'transparent' },
  blue:   { bg: '#eff6ff', text: '#1e3a8a', sub: '#3b82f6', icon: '#bfdbfe', label: '#60a5fa', border: '#bfdbfe' },
  green:  { bg: '#f0fdf4', text: '#14532d', sub: '#16a34a', icon: '#bbf7d0', label: '#4ade80', border: '#bbf7d0' },
  purple: { bg: '#faf5ff', text: '#581c87', sub: '#9333ea', icon: '#e9d5ff', label: '#c084fc', border: '#e9d5ff' },
  amber:  { bg: '#fffbeb', text: '#78350f', sub: '#d97706', icon: '#fde68a', label: '#fbbf24', border: '#fde68a' },
};

export function StatCard({ label, value, icon, accent, sub }: StatCardProps) {
  const a = accent ? accentMap[accent] : null;

  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        borderColor: a ? a.border : 'var(--surface-card-border)',
        backgroundColor: a ? a.bg : '#ffffff',
        boxShadow: a?.bg === '#0f1f3d'
          ? '0 4px 14px -2px rgb(15 31 61 / 0.35)'
          : 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1.5">
          <p
            className="text-[10.5px] font-bold uppercase tracking-[0.07em]"
            style={{ color: a ? a.label : 'var(--color-gray-400)' }}
          >
            {label}
          </p>
          <p
            className="text-[2rem] font-bold tracking-[-0.03em] leading-none"
            style={{ color: a ? a.text : 'var(--color-gray-900)' }}
          >
            {value}
          </p>
          {sub && (
            <p className="text-xs font-medium" style={{ color: a ? a.sub : 'var(--color-gray-400)' }}>
              {sub}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: a ? a.icon : 'var(--color-gray-100)', color: a ? a.text : 'var(--color-gray-400)' }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

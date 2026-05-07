interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: 'blue' | 'green' | 'purple' | 'amber';
}

const accentStyles = {
  blue:   { bg: '#eff6ff', text: '#1d4ed8', icon: '#93c5fd' },
  green:  { bg: '#f0fdf4', text: '#15803d', icon: '#86efac' },
  purple: { bg: '#faf5ff', text: '#7e22ce', icon: '#c4b5fd' },
  amber:  { bg: '#fffbeb', text: '#b45309', icon: '#fcd34d' },
};

export function StatCard({ label, value, icon, accent }: StatCardProps) {
  const a = accent ? accentStyles[accent] : null;

  return (
    <div
      className="rounded-2xl border bg-white p-5 transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: a ? `${a.icon}50` : '#f3f4f6',
        backgroundColor: a ? a.bg : '#ffffff',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-2"
            style={{ color: a ? a.text : '#9ca3af' }}
          >
            {label}
          </p>
          <p
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: a ? a.text : '#111827' }}
          >
            {value}
          </p>
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: a ? `${a.icon}40` : '#f3f4f6', color: a ? a.text : '#9ca3af' }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

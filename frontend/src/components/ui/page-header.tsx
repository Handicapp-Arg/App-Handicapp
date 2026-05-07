import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; color?: 'green' | 'blue' | 'amber' };
  action?: React.ReactNode;
  back?: React.ReactNode;
}

/**
 * Header de página consistente — espejo visual del ScreenHeader de mobile.
 * Usarlo en todas las páginas del dashboard para uniformidad.
 */
export function PageHeader({ title, subtitle, badge, action, back }: PageHeaderProps) {
  const badgeColors = {
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  };

  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3 min-w-0">
        {back}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[1.375rem] font-extrabold tracking-tight text-gray-900 leading-tight">
              {title}
            </h1>
            {badge && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColors[badge.color ?? 'green']}`}>
                {badge.color === 'green' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />}
                {badge.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

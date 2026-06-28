import React from 'react';
import { Badge, type BadgeTone } from './badge';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: { label: string; tone?: BadgeTone };
  action?: React.ReactNode;
  back?: React.ReactNode;
}

export function PageHeader({ title, subtitle, badge, action, back }: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {back}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h1 className="font-display text-[1.375rem] font-bold tracking-[-0.025em] text-gray-900 leading-tight">
              {title}
            </h1>
            {badge && (
              <Badge tone={badge.tone ?? 'success'} dot>
                {badge.label}
              </Badge>
            )}
          </div>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

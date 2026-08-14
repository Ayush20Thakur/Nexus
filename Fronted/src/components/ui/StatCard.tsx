import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: number;
  trendLabel?: string;
  iconColor?: string;
  accentColor?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
  children?: ReactNode;
}

const accentMap = {
  primary: { icon: 'text-primary', gradient: 'from-primary/5', trend: 'text-primary' },
  success: { icon: 'text-success-green', gradient: 'from-success-green/5', trend: 'text-success-green' },
  warning: { icon: 'text-warning-amber', gradient: 'from-warning-amber/5', trend: 'text-warning-amber' },
  error: { icon: 'text-error-red', gradient: 'from-error-red/10', trend: 'text-error-red' },
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  accentColor = 'primary',
  className,
  children,
}: StatCardProps) {
  const accent = accentMap[accentColor];
  const isNegativeTrend = accentColor === 'error';

  return (
    <div
      className={clsx(
        'flex flex-col p-5 bg-surface-container rounded-xl shadow-sm relative overflow-hidden group transition-all duration-300',
        isNegativeTrend && 'border-t-2 border-error-red',
        className
      )}
    >
      {/* Hover gradient */}
      <div
        className={clsx(
          'absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none',
          accent.gradient,
          isNegativeTrend ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-500'
        )}
      />

      {/* Critical top accent */}
      {isNegativeTrend && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-error-red shadow-glow-error" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
            {label}
          </span>
          <span className={clsx('material-symbols-outlined text-[20px]', accent.icon)}>
            {icon}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={clsx(
              'text-page-title font-page-title',
              isNegativeTrend ? 'text-error-red' : 'text-on-surface'
            )}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>

          {trend !== undefined && (
            <span
              className={clsx(
                'text-metadata font-metadata flex items-center gap-0.5',
                accent.trend
              )}
            >
              <span className="material-symbols-outlined text-[12px]">
                {trend >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              {Math.abs(trend)}%{trendLabel ? ` ${trendLabel}` : ''}
            </span>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

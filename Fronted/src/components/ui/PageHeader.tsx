import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={clsx('flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12', className)}>
      <div>
        <h1 className="text-page-title font-page-title text-on-surface mb-2 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-body-md font-body-md text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 flex-wrap">{children}</div>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  icon?: string;
  tag?: string;
}

export function SectionHeader({ title, subtitle, children, className, icon, tag }: SectionHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between mb-6', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">{icon}</span>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-section-title font-section-title text-on-surface">{title}</h2>
            {tag && (
              <span className="px-2 py-0.5 bg-surface-container-high rounded-md text-label-caps font-label-caps text-on-surface-variant">
                {tag}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center py-16 px-8 text-center', className)}>
      <span className="material-symbols-outlined text-[48px] text-outline mb-4">{icon}</span>
      <h3 className="text-section-title font-section-title text-on-surface mb-2">{title}</h3>
      <p className="text-body-md font-body-md text-on-surface-variant max-w-md mb-6">{description}</p>
      {action}
    </div>
  );
}

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 skeleton rounded-xl" />
      ))}
    </div>
  );
}

interface IconBadgeProps {
  icon: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'ai' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const iconBadgeStyles = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success-green/10 text-success-green',
  warning: 'bg-warning-amber/10 text-warning-amber',
  error: 'bg-error-red/10 text-error-red',
  ai: 'bg-ai-accent/10 text-ai-accent',
  neutral: 'bg-surface-container-high text-on-surface-variant',
};

const iconBadgeSizes = {
  sm: 'w-7 h-7 text-[16px]',
  md: 'w-10 h-10 text-[20px]',
  lg: 'w-12 h-12 text-[24px]',
};

export function IconBadge({ icon, color = 'neutral', size = 'md', className }: IconBadgeProps) {
  return (
    <div className={clsx('rounded-lg flex items-center justify-center shrink-0', iconBadgeStyles[color], iconBadgeSizes[size], className)}>
      <span className={clsx('material-symbols-outlined', iconBadgeSizes[size].split(' ')[2])}>
        {icon}
      </span>
    </div>
  );
}

interface DividerProps {
  className?: string;
  label?: string;
}

export function Divider({ className, label }: DividerProps) {
  if (label) {
    return (
      <div className={clsx('flex items-center gap-3 my-4', className)}>
        <div className="flex-1 h-[1px] bg-outline-variant/20" />
        <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
        <div className="flex-1 h-[1px] bg-outline-variant/20" />
      </div>
    );
  }
  return <div className={clsx('h-[1px] bg-outline-variant/10 my-4', className)} />;
}

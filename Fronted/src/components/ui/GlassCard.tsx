import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  level?: 1 | 2 | 3;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const levelClasses = {
  1: 'bg-surface-container-low/80 backdrop-blur-xl border border-outline-variant/10',
  2: 'bg-surface-container rounded-xl border border-outline-variant/10 shadow-sm',
  3: 'bg-surface-container-high rounded-xl border border-outline-variant/10 shadow-glass',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
};

export function GlassCard({
  children,
  className,
  level = 2,
  hover = false,
  onClick,
  padding = 'md',
}: GlassCardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden',
        level === 1 ? 'rounded-xl' : 'rounded-xl',
        levelClasses[level],
        paddingClasses[padding],
        hover && 'transition-all duration-300 hover:bg-surface-container-high cursor-pointer group',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

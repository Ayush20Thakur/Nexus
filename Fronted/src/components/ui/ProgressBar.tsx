import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number; // 0–100
  max?: number;
  variant?: 'success' | 'warning' | 'error' | 'primary';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const variantClasses = {
  success: 'bg-success-green shadow-glow-success',
  warning: 'bg-warning-amber',
  error: 'bg-error-red shadow-glow-error',
  primary: 'bg-primary',
};

const sizeClasses = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  size = 'sm',
  showLabel = false,
  label,
  animated = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  // Auto-determine variant by percentage if not explicitly set
  const autoVariant =
    variant !== 'primary'
      ? variant
      : pct >= 75
      ? 'success'
      : pct >= 40
      ? 'warning'
      : 'error';

  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-body-sm font-body-sm text-on-surface-variant">{label}</span>
          )}
          {showLabel && (
            <span className="text-mono-data font-mono-data text-on-surface">{value}%</span>
          )}
        </div>
      )}
      <div className={clsx('w-full bg-surface-container-highest rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-700 ease-out',
            variantClasses[autoVariant],
            animated && 'animate-pulse-slow'
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

// Segmented progress bar (matches Stitch Operational Health display)
interface SegmentedProgressProps {
  segments: Array<{ color: 'success' | 'warning' | 'error' | 'neutral'; percentage: number }>;
  className?: string;
}

export function SegmentedProgress({ segments, className }: SegmentedProgressProps) {
  const colorMap = {
    success: 'bg-success-green',
    warning: 'bg-warning-amber',
    error: 'bg-error-red',
    neutral: 'bg-surface-container-highest',
  };

  return (
    <div className={clsx('w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex gap-[2px]', className)}>
      {segments.map((seg, i) => (
        <div
          key={i}
          className={clsx('h-full', colorMap[seg.color])}
          style={{ flex: seg.percentage }}
        />
      ))}
    </div>
  );
}

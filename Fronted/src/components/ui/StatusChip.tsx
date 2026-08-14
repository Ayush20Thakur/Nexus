import { clsx } from 'clsx';

interface StatusChipProps {
  status: 'success' | 'warning' | 'error' | 'neutral' | 'ai' | 'info';
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

const statusStyles = {
  success: 'bg-success-green/10 text-success-green border border-success-green/20',
  warning: 'bg-warning-amber/10 text-warning-amber border border-warning-amber/20',
  error: 'bg-error-red/10 text-error-red border border-error-red/20',
  neutral: 'bg-surface-container text-on-surface-variant border border-outline-variant/20',
  ai: 'bg-ai-accent/10 text-ai-accent border border-ai-accent/20',
  info: 'bg-primary/10 text-primary border border-primary/20',
};

const dotStyles = {
  success: 'bg-success-green',
  warning: 'bg-warning-amber',
  error: 'bg-error-red',
  neutral: 'bg-on-surface-variant',
  ai: 'bg-ai-accent',
  info: 'bg-primary',
};

export function StatusChip({ status, label, dot = true, size = 'sm', pulse = false }: StatusChipProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-label-caps text-label-caps uppercase tracking-wider',
        statusStyles[status],
        size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={clsx('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotStyles[status])} />
          )}
          <span className={clsx('relative inline-flex rounded-full h-1.5 w-1.5', dotStyles[status])} />
        </span>
      )}
      {label}
    </span>
  );
}

// Convenience exports for common status patterns
export function RequestStatusChip({ status }: { status: string }) {
  const map: Record<string, { s: StatusChipProps['status']; l: string }> = {
    PENDING: { s: 'warning', l: 'Pending' },
    APPROVED: { s: 'success', l: 'Approved' },
    REJECTED: { s: 'error', l: 'Rejected' },
    IN_PROGRESS: { s: 'info', l: 'In Progress' },
    COMPLETED: { s: 'success', l: 'Completed' },
    CANCELLED: { s: 'neutral', l: 'Cancelled' },
  };
  const cfg = map[status] ?? { s: 'neutral' as const, l: status };
  return <StatusChip status={cfg.s} label={cfg.l} />;
}

export function PriorityChip({ priority }: { priority: string }) {
  const map: Record<string, { s: StatusChipProps['status']; l: string }> = {
    CRITICAL: { s: 'error', l: 'Critical' },
    HIGH: { s: 'warning', l: 'High' },
    NORMAL: { s: 'neutral', l: 'Normal' },
    LOW: { s: 'neutral', l: 'Low' },
  };
  const cfg = map[priority] ?? { s: 'neutral' as const, l: priority };
  return <StatusChip status={cfg.s} label={cfg.l} pulse={priority === 'CRITICAL'} />;
}

export function InventoryStatusChip({ status }: { status: string }) {
  const map: Record<string, { s: StatusChipProps['status']; l: string }> = {
    OPTIMAL: { s: 'success', l: 'Optimal' },
    LOW: { s: 'warning', l: 'Low Stock' },
    CRITICAL: { s: 'error', l: 'Critical' },
    OVERSTOCK: { s: 'info', l: 'Overstock' },
    INACTIVE: { s: 'neutral', l: 'Inactive' },
  };
  const cfg = map[status] ?? { s: 'neutral' as const, l: status };
  return <StatusChip status={cfg.s} label={cfg.l} />;
}

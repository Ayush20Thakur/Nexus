import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { useOperationsStore } from '@/store/operationsStore';
import { useToast } from '@/components/ui/Toast';
import { formatRelativeTime } from '@/utils/date';
import type { FulfillmentStatus } from '@/types';
import { clsx } from 'clsx';

const STATUS_STEPS: FulfillmentStatus[] = ['QUEUED', 'PROCESSING', 'ALLOCATED', 'SHIPPED', 'DELIVERED'];

const statusConfig: Record<FulfillmentStatus, { color: 'success' | 'warning' | 'error' | 'neutral' | 'ai' | 'info'; label: string; icon: string }> = {
  QUEUED:     { color: 'neutral',  label: 'Queued',     icon: 'hourglass_empty' },
  PROCESSING: { color: 'info',    label: 'Processing',  icon: 'sync' },
  ALLOCATED:  { color: 'warning', label: 'Allocated',   icon: 'inventory' },
  SHIPPED:    { color: 'ai',      label: 'Shipped',     icon: 'local_shipping' },
  DELIVERED:  { color: 'success', label: 'Delivered',   icon: 'check_circle' },
  FAILED:     { color: 'error',   label: 'Failed',      icon: 'error' },
};

export default function FulfillmentPage() {
  const { fulfillment, advanceFulfillmentStatus } = useOperationsStore();
  const { success, error } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = useMemo(() => {
    if (filterStatus === 'ALL') return fulfillment;
    return fulfillment.filter((o) => o.status === filterStatus);
  }, [fulfillment, filterStatus]);

  const stats = useMemo(() => {
    return {
      queued: fulfillment.filter((o) => o.status === 'QUEUED').length,
      transit: fulfillment.filter((o) => ['PROCESSING', 'ALLOCATED', 'SHIPPED'].includes(o.status)).length,
      delivered: fulfillment.filter((o) => o.status === 'DELIVERED').length,
      total: fulfillment.length,
    };
  }, [fulfillment]);

  const handleAdvance = async (id: string, currentStatus: FulfillmentStatus, title: string) => {
    try {
      await advanceFulfillmentStatus(id);
      const nextIdx = STATUS_STEPS.indexOf(currentStatus) + 1;
      if (nextIdx < STATUS_STEPS.length) {
        success('Fulfillment Advanced', `${title} advanced to ${STATUS_STEPS[nextIdx]}.`);
      }
    } catch {
      error('Fulfillment Not Advanced', 'The backend rejected the fulfillment transition.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Fulfillment Center"
        subtitle="Track inventory dispatch, carrier assignments, and delivery status"
      />

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Queued', value: stats.queued, icon: 'hourglass_empty', color: 'text-on-surface-variant' },
          { label: 'In Progress / Transit', value: stats.transit, icon: 'local_shipping', color: 'text-warning-amber' },
          { label: 'Delivered', value: stats.delivered, icon: 'check_circle', color: 'text-success-green' },
          { label: 'Total Orders', value: stats.total, icon: 'inventory', color: 'text-primary' },
        ].map((s) => (
          <GlassCard key={s.label} className="flex items-center gap-4">
            <span className={clsx('material-symbols-outlined text-[24px]', s.color)}>{s.icon}</span>
            <div>
              <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">{s.label}</p>
              <p className={clsx('text-section-title font-section-title', s.color)}>{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', ...STATUS_STEPS].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={clsx(
              'px-3.5 py-1.5 rounded-lg text-body-sm font-body-sm transition-all',
              filterStatus === st
                ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            )}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Fulfillment Orders */}
      <div className="space-y-4">
        {filtered.map((order) => {
          const cfg = statusConfig[order.status] ?? statusConfig.QUEUED;
          const currentIdx = STATUS_STEPS.indexOf(order.status as FulfillmentStatus);
          const isComplete = order.status === 'DELIVERED';
          const stockPct = Math.min(100, Math.round((order.approvedQuantity / (order.availableStock || 1)) * 100));

          return (
            <GlassCard key={order.id} className="relative overflow-visible">
              <div
                className={clsx(
                  'absolute top-0 left-0 w-1 h-full',
                  order.priority === 'CRITICAL' ? 'bg-error-red' :
                  order.priority === 'HIGH' ? 'bg-warning-amber' : 'bg-surface-container-high'
                )}
              />
              <div className="pl-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <StatusChip status={cfg.color} label={cfg.label} />
                      <span className="text-mono-data font-mono-data text-on-surface-variant font-bold">
                        {order.requestNumber}
                      </span>
                    </div>
                    <h3 className="text-card-title font-card-title text-on-surface">{order.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    {order.trackingNumber && (
                      <span className="text-metadata font-metadata text-primary font-mono-data bg-surface-container px-2 py-1 rounded">
                        {order.trackingNumber}
                      </span>
                    )}
                    {!isComplete && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAdvance(order.id, order.status as FulfillmentStatus, order.title)}
                      >
                        Advance Stage →
                      </Button>
                    )}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Requested By</p>
                    <p className="text-body-sm font-body-sm text-on-surface">{order.requestedBy}</p>
                  </div>
                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Approved By</p>
                    <p className="text-body-sm font-body-sm text-on-surface">{order.approvedBy}</p>
                  </div>
                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Dispatched Qty</p>
                    <p className="text-body-sm font-body-sm text-on-surface font-semibold">
                      {order.approvedQuantity} {order.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Carrier</p>
                    <p className="text-body-sm font-body-sm text-on-surface">{order.carrier ?? 'Pending Assignment'}</p>
                  </div>
                </div>

                {/* Stock Allocation Meter */}
                <div className="bg-surface-container rounded-lg p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-label-caps font-label-caps text-on-surface-variant uppercase">
                      Stock Allocation Meter
                    </span>
                    <span className="text-metadata font-metadata text-on-surface-variant font-mono-data">
                      {order.approvedQuantity} allocated / {order.availableStock} available
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden flex">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${stockPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-metadata font-metadata text-on-surface-variant mt-2">
                    <span>Approved: {formatRelativeTime(order.approvedAt)}</span>
                    <span>Safety Margin: Min {order.safetyStockMin} / Max {order.safetyStockMax}</span>
                  </div>
                </div>

                {/* Progress Lifecycle Stepper */}
                <div className="flex items-center gap-0 overflow-visible px-2 py-3">
                  {STATUS_STEPS.map((step, idx) => {
                    const isDone = idx <= currentIdx;
                    return (
                      <div key={step} className="flex items-center flex-1 min-w-0">
                        <div
                          className={clsx(
                            'relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0 transition-all duration-300 font-bold',
                            isDone
                              ? 'bg-success-green text-surface'
                              : 'bg-surface-container-high text-on-surface-variant',
                            idx === currentIdx &&
                              'ring-2 ring-success-green ring-offset-2 ring-offset-surface-container-low scale-105'
                          )}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        {idx < STATUS_STEPS.length - 1 && (
                          <div
                            className={clsx(
                              'h-[2px] flex-1 mx-1 rounded transition-colors duration-500',
                              idx < currentIdx ? 'bg-success-green' : 'bg-surface-container-high'
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-0 mt-1">
                  {STATUS_STEPS.map((step) => (
                    <div key={step} className="flex-1 min-w-0 text-center">
                      <span className="text-metadata font-metadata text-on-surface-variant block truncate px-1">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          );
        })}

        {filtered.length === 0 && (
          <GlassCard className="py-16 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">
              local_shipping
            </span>
            <p className="text-section-title font-section-title text-on-surface mb-1">No orders in this state</p>
            <p className="text-body-md font-body-md text-on-surface-variant">
              Approved requests will appear here automatically.
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

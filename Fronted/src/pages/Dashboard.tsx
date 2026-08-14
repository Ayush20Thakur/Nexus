import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { StatusChip } from '@/components/ui/StatusChip';
import { ProgressBar, SegmentedProgress } from '@/components/ui/ProgressBar';
import { PageHeader } from '@/components/ui/PageHeader';
import { RequestDetailModal } from '@/components/operations/RequestDetailModal';
import { useOperationsStore } from '@/store/operationsStore';
import { formatAbsoluteTime, formatRelativeTime, getCurrentISO } from '@/utils/date';
import type { OperationalRequest } from '@/types';
import { clsx } from 'clsx';

const CHART_COLORS = {
  primary: '#e4e2e3',
  success: '#81c995',
  warning: '#fbbc04',
  error: '#ffb4ab',
  muted: 'rgba(228,226,227,0.08)',
};

const activityTypeMap: Record<string, { icon: string; color: string }> = {
  alert:       { icon: 'warning',        color: 'text-error-red' },
  approval:    { icon: 'verified',       color: 'text-success-green' },
  system:      { icon: 'settings',       color: 'text-warning-amber' },
  fulfillment: { icon: 'local_shipping', color: 'text-primary' },
  ai:          { icon: 'smart_toy',      color: 'text-ai-accent' },
  request:     { icon: 'sync_alt',       color: 'text-on-surface-variant' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { requests, inventory, fulfillment, activityFeed, getKPIs, dashboardSummary, isLoading, loadAll } = useOperationsStore();
  const [selectedRequest, setSelectedRequest] = useState<OperationalRequest | null>(null);
  const dashboard = dashboardSummary;
  const kpi = useMemo(() => dashboard?.kpis ?? getKPIs(), [dashboard, getKPIs, requests, inventory, fulfillment]);
  const requestVolume = dashboard?.requestVolume ?? [];
  const inventoryTrend = dashboard?.inventoryTrend ?? [];
  const healthMetrics = dashboard?.healthMetrics ?? [];
  const overallSla = dashboard?.overallSla ?? kpi.operationalHealth;
  const activityRows = dashboard?.activityFeed ?? activityFeed;
  const executiveBrief = dashboard?.executiveBrief;

  useEffect(() => {
    if (!dashboardSummary && !isLoading) {
      void loadAll();
    }
  }, [dashboardSummary, isLoading, loadAll]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Operational Overview"
        subtitle="Real-time intelligence across your entire operation"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg text-body-sm font-body-sm text-on-surface-variant border border-outline-variant/20">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          {formatAbsoluteTime(getCurrentISO(), 'MMM d, yyyy · HH:mm')}
        </div>
      </PageHeader>

      {/* KPI Row — Dynamically computed from store */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Available Inventory"
          value={kpi.availableInventory}
          icon="inventory_2"
          trend={kpi.inventoryTrend}
          trendLabel="reserved share"
          accentColor="primary"
        />
        <StatCard
          label="Pending Requests"
          value={kpi.pendingRequests}
          icon="sync_alt"
          trend={kpi.requestsTrend}
          trendLabel="pending share"
          accentColor="warning"
        />
        <StatCard
          label="Critical Requests"
          value={kpi.criticalRequests}
          icon="priority_high"
          accentColor="error"
        />
        <StatCard
          label="Operational Health"
          value={`${kpi.operationalHealth}%`}
          icon="health_and_safety"
          accentColor="success"
        />
      </div>

      {executiveBrief && (
        <GlassCard padding="lg" className="border border-ai-accent/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-3">
              <p className="text-label-caps font-label-caps text-ai-accent uppercase mb-2">Executive Brief</p>
              <div className="flex items-end gap-3">
                <span className="text-page-title font-page-title text-on-surface">
                  {executiveBrief.readinessScore}%
                </span>
                <span
                  className={clsx(
                    'mb-1 px-2 py-1 rounded-full text-label-caps font-label-caps border',
                    executiveBrief.status === 'READY'
                      ? 'bg-success-green/10 text-success-green border-success-green/20'
                      : executiveBrief.status === 'WATCH'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : executiveBrief.status === 'AT_RISK'
                          ? 'bg-warning-amber/10 text-warning-amber border-warning-amber/20'
                          : 'bg-error-red/10 text-error-red border-error-red/20'
                  )}
                >
                  {executiveBrief.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <h2 className="text-section-title font-section-title text-on-surface mb-1">{executiveBrief.headline}</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">{executiveBrief.riskNarrative}</p>
            </div>

            <div className="lg:col-span-3 grid grid-cols-3 gap-3">
              {[
                { label: 'Queue', value: executiveBrief.queuePressure },
                { label: 'Auto', value: `${executiveBrief.automationRate}%` },
                { label: 'AI Conf', value: `${executiveBrief.avgAiConfidence}%` },
              ].map((metric) => (
                <div key={metric.label} className="bg-surface-container rounded-lg p-3">
                  <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">{metric.label}</p>
                  <p className="text-card-title font-card-title text-on-surface">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1 flex lg:justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  navigate('/copilot?prompt=Create%20an%20executive%20brief%20for%20current%20NEXUS%20risk%2C%20approvals%2C%20inventory%2C%20fulfillment%2C%20and%20next%20actions.')
                }
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                Brief
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5 pt-5 border-t border-outline-variant/10">
            {executiveBrief.nextActions.map((action) => (
              <div key={action} className="flex items-start gap-2 text-body-sm font-body-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-ai-accent mt-0.5">arrow_circle_right</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Request Volume Chart */}
        <GlassCard className="lg:col-span-8" padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-section-title font-section-title text-on-surface">Request Volume</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">7-day database throughput</p>
            </div>
            <div className="flex items-center gap-4 text-metadata font-metadata text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />Requests
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success-green" />Approved
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={requestVolume} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => String(d).slice(5)} tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#2b2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="requests" fill={CHART_COLORS.muted} stroke={CHART_COLORS.primary} strokeWidth={1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="approved" fill={CHART_COLORS.success} opacity={0.8} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Operational Health */}
        <GlassCard className="lg:col-span-4" padding="lg">
          <h2 className="text-section-title font-section-title text-on-surface mb-6">System Health</h2>
          <div className="space-y-5">
            {healthMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body-sm font-body-sm text-on-surface-variant">{metric.label}</span>
                  <span className="text-mono-data font-mono-data text-on-surface">{metric.value}%</span>
                </div>
                <SegmentedProgress segments={metric.segments} />
              </div>
            ))}
          </div>

          {/* Overall */}
          <div className="mt-6 pt-5 border-t border-outline-variant/10">
            <div className="flex items-center justify-between">
              <span className="text-body-md font-semibold text-on-surface">Overall SLA</span>
              <span className="text-section-title font-section-title text-success-green">{overallSla}%</span>
            </div>
            <ProgressBar value={overallSla} variant="success" size="md" className="mt-2" />
          </div>
        </GlassCard>
      </div>

      {/* Inventory Trend + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Trend */}
        <GlassCard className="lg:col-span-5" padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-section-title font-section-title text-on-surface">Inventory By Zone</h2>
              <p className="text-body-sm font-body-sm text-on-surface-variant">Current stock units</p>
            </div>
            <StatusChip status={inventoryTrend.length ? 'success' : 'neutral'} label={inventoryTrend.length ? 'Live' : 'No Data'} pulse={inventoryTrend.length > 0} />
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={inventoryTrend}>
              <defs>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#2b2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Area type="monotone" dataKey="units" name="Units" stroke={CHART_COLORS.primary} strokeWidth={2} fill="url(#invGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Dynamic Activity Feed */}
        <GlassCard className="lg:col-span-7" padding="none">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant/10">
            <h2 className="text-section-title font-section-title text-on-surface">Live Activity</h2>
            <span className="flex items-center gap-1.5 text-label-caps font-label-caps text-success-green">
              <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse" />
              STREAM
            </span>
          </div>
          <div className="divide-y divide-outline-variant/5 max-h-80 overflow-y-auto scrollbar-none">
            {activityRows.map((item) => {
              const conf = activityTypeMap[item.type] ?? activityTypeMap.request;
              return (
                <div key={item.id} className="flex items-start gap-4 px-6 py-4 hover:bg-surface-container-high/50 transition-colors">
                  <div className={clsx('mt-0.5 shrink-0', conf.color)}>
                    <span className="material-symbols-outlined text-[20px]">{conf.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-card-title text-card-title text-on-surface">{item.title}</p>
                    <p className="text-body-sm font-body-sm text-on-surface-variant truncate">{item.description}</p>
                  </div>
                  <span className="text-metadata font-metadata text-outline shrink-0">
                    {item.timestamp.includes('T') ? formatRelativeTime(item.timestamp) : item.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Recent Requests — Real-time from store */}
      <GlassCard padding="none">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-outline-variant/10">
          <h2 className="text-section-title font-section-title text-on-surface">Recent Requests</h2>
          <Link to="/requests" className="text-body-sm font-body-sm text-primary hover:underline">
            View all ({requests.length}) →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>Request #</th>
                <th>Title</th>
                <th>Requester</th>
                <th>Priority</th>
                <th>Status</th>
                <th>AI Confidence</th>
              </tr>
            </thead>
            <tbody>
              {requests.slice(0, 5).map((req) => (
                <tr
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className="cursor-pointer hover:bg-surface-container-high/50"
                >
                  <td className="font-mono-data text-mono-data text-on-surface-variant">{req.requestNumber}</td>
                  <td className="font-semibold">{req.title}</td>
                  <td className="text-on-surface-variant">{req.requester}</td>
                  <td>
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-label-caps font-label-caps',
                      req.priority === 'CRITICAL' ? 'bg-error-container/30 text-error-red font-bold' :
                      req.priority === 'HIGH'     ? 'bg-warning-amber/10 text-warning-amber' :
                                                    'bg-surface-container-high text-on-surface-variant'
                    )}>
                      {req.priority}
                    </span>
                  </td>
                  <td>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-label-caps font-label-caps border',
                      req.status === 'APPROVED' ? 'bg-success-green/10 text-success-green border-success-green/20' :
                      req.status === 'PENDING'  ? 'bg-warning-amber/10 text-warning-amber border-warning-amber/20' :
                      req.status === 'COMPLETED'? 'bg-primary/10 text-primary border-primary/20' :
                                                   'bg-surface-container text-on-surface-variant border-outline-variant/20'
                    )}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <ProgressBar value={req.aiConfidence} variant="success" size="xs" className="w-16" />
                      <span className="text-mono-data font-mono-data text-on-surface-variant">{req.aiConfidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <RequestDetailModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />
    </div>
  );
}

import { useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import { useToast } from '@/components/ui/Toast';
import { useOperationsStore } from '@/store/operationsStore';

const PIE_COLORS = ['#e4e2e3', '#c8c6c7', '#81c995', '#fbbc04', '#ffb4ab', '#c8c5c9'];

export default function InsightsPage() {
  const { success, info } = useToast();
  const { insightsSummary, isLoading, loadAll } = useOperationsStore();
  const kpis = insightsSummary?.kpis ?? [];
  const requestVolume = insightsSummary?.requestVolume ?? [];
  const inventoryDistribution = insightsSummary?.inventoryDistribution ?? [];
  const dateWindow = requestVolume.length
    ? `${requestVolume[0].date} to ${requestVolume[requestVolume.length - 1].date}`
    : 'Connected DB window';

  useEffect(() => {
    if (!insightsSummary && !isLoading) {
      void loadAll();
    }
  }, [insightsSummary, isLoading, loadAll]);

  const handleExport = () => {
    const rows = requestVolume.map((row) => `${row.date},${row.requests},${row.approved},${row.rejected}`).join('\n');
    const blob = new Blob([`date,requests,approved,rejected\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-insights-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    success('Insights Exported', 'Insights CSV export downloaded.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Operational Insights"
        subtitle="AI-driven analytics across inventory, requests, and fulfillment"
      >
        <Button
          variant="secondary"
          onClick={() => info('Date Window', 'Insights are generated from the current connected database window.')}
          leftIcon={<span className="material-symbols-outlined text-[18px]">calendar_month</span>}
        >
          {dateWindow}
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          leftIcon={<span className="material-symbols-outlined text-[18px]">download</span>}
        >
          Export Report
        </Button>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <GlassCard key={kpi.label} className="flex flex-col gap-2">
            <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">{kpi.label}</p>
            <p className="text-section-title font-section-title text-on-surface">
              {kpi.value}
              {kpi.unit && <span className="text-body-sm font-body-sm text-on-surface-variant ml-1">{kpi.unit}</span>}
            </p>
            <span className={clsx(
              'flex items-center gap-1 text-metadata font-metadata',
              kpi.trendDirection === 'up' ? 'text-success-green' :
              kpi.trendDirection === 'down' ? 'text-success-green' : 'text-on-surface-variant'
            )}>
              <span className="material-symbols-outlined text-[12px]">
                {kpi.trendDirection === 'up' ? 'trending_up' : 'trending_down'}
              </span>
              {Math.abs(kpi.trend)}% vs last period
            </span>
          </GlassCard>
        ))}
      </div>

      {/* Request Volume Area Chart */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-section-title font-section-title text-on-surface">Request Volume Trend</h2>
            <p className="text-body-sm font-body-sm text-on-surface-variant">{dateWindow} daily breakdown</p>
          </div>
          <div className="flex items-center gap-4 text-metadata font-metadata text-on-surface-variant">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Total</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success-green" />Approved</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error-red" />Rejected</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={requestVolume}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#e4e2e3" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#e4e2e3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#81c995" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#81c995" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#2b2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ffffff' }}
              labelStyle={{ color: '#ffffff' }}
              itemStyle={{ color: '#ffffff' }}
            />
            <Area type="monotone" dataKey="requests" name="Total" stroke="#e4e2e3" strokeWidth={2} fill="url(#gradTotal)" dot={false} />
            <Area type="monotone" dataKey="approved" name="Approved" stroke="#81c995" strokeWidth={2} fill="url(#gradApproved)" dot={false} />
            <Area type="monotone" dataKey="rejected" name="Rejected" stroke="#ffb4ab" strokeWidth={1.5} fill="none" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Bottom Row: Inventory Distribution + Request Types */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart */}
        <GlassCard className="lg:col-span-5" padding="lg">
          <h2 className="text-section-title font-section-title text-on-surface mb-6">Inventory by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={inventoryDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="category"
              >
                {inventoryDistribution.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#2b2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {inventoryDistribution.map((item, idx) => (
              <div key={item.category} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                <span className="text-body-sm font-body-sm text-on-surface-variant truncate">{item.category}</span>
                <span className="text-mono-data font-mono-data text-on-surface-variant ml-auto">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Request Bar Chart */}
        <GlassCard className="lg:col-span-7" padding="lg">
          <h2 className="text-section-title font-section-title text-on-surface mb-6">Daily Request Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={requestVolume.slice(-7)} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#c6c6ca', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#2b2a2a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Bar dataKey="approved" name="Approved" fill="#81c995" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rejected" name="Rejected" fill="#ffb4ab" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}

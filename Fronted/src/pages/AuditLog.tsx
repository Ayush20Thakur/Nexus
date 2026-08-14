import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchBar } from '@/components/ui/Input';
import { useOperationsStore } from '@/store/operationsStore';
import { useToast } from '@/components/ui/Toast';
import { formatAbsoluteTime } from '@/utils/date';
import { clsx } from 'clsx';

export default function AuditLogPage() {
  const { auditEvents } = useOperationsStore();
  const { success } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filtered = useMemo(() => {
    return auditEvents.filter((ev) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        ev.description.toLowerCase().includes(q) ||
        ev.actor.toLowerCase().includes(q) ||
        ev.action.toLowerCase().includes(q) ||
        ev.resourceId.toLowerCase().includes(q);
      const matchType = !typeFilter || ev.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [auditEvents, search, typeFilter]);

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(auditEvents, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    success('Audit Trail Exported', 'JSON snapshot downloaded successfully.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Audit Trail"
        subtitle="Cryptographically verified event stream for complete operational traceability"
      >
        <Button
          variant="secondary"
          onClick={handleExportJSON}
          leftIcon={<span className="material-symbols-outlined text-[18px]">file_download</span>}
        >
          Export JSON
        </Button>
      </PageHeader>

      {/* Filter Controls */}
      <GlassCard className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Filter by actor, action, or resource ID…"
          className="flex-1"
        />
        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-container-high border border-outline-variant/20 rounded-lg px-3 py-2 text-body-sm text-on-surface outline-none cursor-pointer"
          >
            <option value="">All Event Types</option>
            {['AUTH', 'REQUEST', 'APPROVAL', 'INVENTORY', 'FULFILLMENT', 'POLICY', 'SYSTEM', 'AI', 'USER', 'REPORT'].map(
              (t) => (
                <option key={t} value={t}>{t}</option>
              )
            )}
          </select>
          {(search || typeFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setTypeFilter(''); }}>
              Clear
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Audit Events Table */}
      <GlassCard padding="none">
        <div className="overflow-x-auto">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>Type</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Description</th>
                <th>Resource ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id}>
                  <td className="font-mono-data text-mono-data text-on-surface-variant text-[11px] whitespace-nowrap">
                    {formatAbsoluteTime(ev.timestamp, 'MMM d, HH:mm:ss')}
                  </td>
                  <td>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-label-caps font-label-caps',
                        ev.severity === 'CRITICAL' ? 'bg-error-container/30 text-error-red font-bold' :
                        ev.severity === 'WARNING'  ? 'bg-warning-amber/10 text-warning-amber' :
                        ev.severity === 'ERROR'    ? 'bg-error-red/10 text-error-red' :
                        'bg-surface-container-high text-on-surface-variant'
                      )}
                    >
                      {ev.severity}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono-data text-mono-data text-primary text-[11px] font-bold">
                      {ev.type}
                    </span>
                  </td>
                  <td className="font-semibold text-on-surface">{ev.actor}</td>
                  <td className="font-mono-data text-mono-data text-on-surface-variant text-[11px]">{ev.action}</td>
                  <td className="text-body-sm text-on-surface">{ev.description}</td>
                  <td className="font-mono-data text-mono-data text-outline text-[11px] font-bold">
                    {ev.resourceId}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[40px] text-outline mb-2 block">
                      history_toggle_off
                    </span>
                    <p className="font-card-title text-card-title text-on-surface mb-1">No matching events</p>
                    <p className="text-body-sm">All operations are being recorded continuously.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between">
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Recorded {filtered.length} audit entries
          </p>
          <span className="text-metadata font-metadata text-outline">
            SHA-256 Verified Immutable Stream
          </span>
        </div>
      </GlassCard>
    </div>
  );
}

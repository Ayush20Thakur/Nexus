import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSystemHealthStore } from '@/store/systemHealthStore';
import { useNotificationsStore } from '@/store/notificationsStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { clsx } from 'clsx';

const BREADCRUMB_MAP: Record<string, string[]> = {
  '/dashboard': ['Operations', 'Overview'],
  '/inventory': ['Operations', 'Inventory'],
  '/requests': ['Operations', 'Requests'],
  '/approvals': ['Operations', 'Approvals'],
  '/fulfillment': ['Operations', 'Fulfillment'],
  '/insights': ['Operations', 'Insights'],
  '/copilot': ['Intelligence', 'NEXUS Copilot'],
  '/decision-engine': ['Intelligence', 'Decision Engine'],
  '/ai-engineering': ['Intelligence', 'AI Engineering'],
  '/policy-center': ['Intelligence', 'Policy Center'],
  '/reports': ['System', 'Reports'],
  '/audit-log': ['System', 'Audit Log'],
  '/settings': ['System', 'Settings'],
  '/admin-console': ['Admin', 'Admin Console'],
};

export function TopBar() {
  const { pathname } = useLocation();
  const { openCommandPalette, toggleNotificationsPanel } = useUIStore();
  const { user } = useAuthStore();
  const { overall, services, uptime, refreshHealth } = useSystemHealthStore();
  const { unreadCount } = useNotificationsStore();

  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const crumbs = BREADCRUMB_MAP[pathname] ?? ['NEXUS', 'Platform'];
  const count = unreadCount();

  const handleRefreshHealth = async () => {
    setRefreshing(true);
    await refreshHealth();
    setRefreshing(false);
  };

  const healthBadgeConfig = {
    READY: { label: 'System Ready', color: 'bg-success-green/10 text-success-green border-success-green/20', dot: 'bg-success-green' },
    DEGRADED: { label: 'Degraded', color: 'bg-warning-amber/10 text-warning-amber border-warning-amber/20', dot: 'bg-warning-amber' },
    OFFLINE: { label: 'System Offline', color: 'bg-error-red/10 text-error-red border-error-red/20', dot: 'bg-error-red' },
    RECONNECTING: { label: 'Reconnecting', color: 'bg-primary/10 text-primary border-primary/20', dot: 'bg-primary animate-ping' },
  };

  const currentBadge = healthBadgeConfig[overall] ?? healthBadgeConfig.READY;
  const serviceStatus = (status: string) => {
    if (status === 'READY') return 'success' as const;
    if (status === 'DEGRADED' || status === 'RECONNECTING') return 'warning' as const;
    return 'error' as const;
  };

  return (
    <>
      <header className="sticky top-0 h-16 bg-surface/80 backdrop-blur-md z-40 px-8 flex items-center justify-between border-b border-outline-variant/5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-on-surface-variant">
          {crumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-2">
              {i > 0 && (
                <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
              )}
              <span
                className={clsx(
                  i === crumbs.length - 1
                    ? 'text-body-sm font-semibold text-on-surface tracking-wide'
                    : 'text-body-sm font-metadata text-on-surface-variant'
                )}
              >
                {crumb}
              </span>
            </span>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-5">
          {/* Search / Command Palette trigger */}
          <button
            id="command-palette-trigger"
            onClick={openCommandPalette}
            className="hidden md:flex items-center gap-3 bg-surface-container-high px-4 py-1.5 rounded-full border border-outline-variant/20 hover:border-outline/40 cursor-pointer transition-all group"
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
            <span className="text-body-sm text-on-surface-variant">Search Operations</span>
            <kbd className="text-[10px] font-mono-data bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 text-on-surface-variant">
              ⌘K
            </kbd>
          </button>

          {/* Service-Driven Health Badge */}
          <button
            onClick={() => setHealthModalOpen(true)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer hover:opacity-80 transition-all',
              currentBadge.color
            )}
            title="Click to view Service Health Diagnostics"
          >
            <span className={clsx('w-2 h-2 rounded-full', currentBadge.dot)} />
            <span className="text-label-caps font-label-caps">{currentBadge.label}</span>
          </button>

          {/* Icons & Actions */}
          <div className="flex items-center gap-2 pl-3 border-l border-outline-variant/20">
            {/* Bell Notifications */}
            <button
              id="notifications-btn"
              onClick={toggleNotificationsPanel}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-on-surface transition-colors relative"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {count > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-error-red text-[9px] font-bold text-surface flex items-center justify-center border-2 border-surface">
                  {count}
                </span>
              )}
            </button>

            {/* User Quick Avatar */}
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-body-sm font-bold shadow-sm"
              title={user?.displayName}
            >
              {user?.displayName?.charAt(0) ?? 'Z'}
            </div>
          </div>
        </div>
      </header>

      {/* System Health Diagnostics Modal */}
      <Modal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
        title="System Health Diagnostics"
        subtitle="Live telemetry and microservice status"
        icon="health_and_safety"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
            <div>
              <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Overall Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={clsx('w-2.5 h-2.5 rounded-full', currentBadge.dot)} />
                <span className="text-section-title font-section-title text-on-surface">{overall}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Readiness</p>
              <p className="text-section-title font-section-title text-success-green">{uptime}%</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Microservice Nodes</p>
            {services.map((svc) => (
              <div key={svc.name} className="flex items-center justify-between p-3.5 bg-surface-container rounded-lg">
                <div>
                  <p className="font-card-title text-card-title text-on-surface">{svc.name}</p>
                  <span className="text-metadata font-metadata text-on-surface-variant">
                    Latency: {svc.latencyMs}ms
                  </span>
                </div>
                <StatusChip status={serviceStatus(svc.status)} label={svc.status} />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" loading={refreshing} onClick={handleRefreshHealth}>
              Refresh Health API
            </Button>
            <Button variant="primary" onClick={() => setHealthModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

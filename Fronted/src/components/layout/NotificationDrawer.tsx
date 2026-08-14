import { useNavigate } from 'react-router-dom';
import { useNotificationsStore } from '@/store/notificationsStore';
import { useUIStore } from '@/store/uiStore';
import { formatRelativeTime } from '@/utils/date';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

const iconMap = {
  alert: { icon: 'warning', color: 'text-error-red bg-error-container/20' },
  approval: { icon: 'verified', color: 'text-success-green bg-success-green/20' },
  system: { icon: 'settings', color: 'text-warning-amber bg-warning-amber/20' },
  fulfillment: { icon: 'local_shipping', color: 'text-primary bg-primary/20' },
  ai: { icon: 'smart_toy', color: 'text-ai-accent bg-ai-accent/20' },
};

export function NotificationDrawer() {
  const { notificationsPanelOpen, toggleNotificationsPanel } = useUIStore();
  const { notifications, markAsRead, markAllAsRead, clearAll } = useNotificationsStore();
  const navigate = useNavigate();

  if (!notificationsPanelOpen) return null;

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) {
      navigate(link);
      toggleNotificationsPanel();
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={toggleNotificationsPanel}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-surface-container-high/95 backdrop-blur-2xl border-l border-outline-variant/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">notifications</span>
            <h2 className="text-section-title font-section-title text-on-surface">Notifications</h2>
            {notifications.some((n) => !n.read) && (
              <span className="px-2 py-0.5 rounded-full bg-error-red text-surface text-label-caps font-label-caps">
                {notifications.filter((n) => !n.read).length} New
              </span>
            )}
          </div>
          <button
            onClick={toggleNotificationsPanel}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-6 py-2 border-b border-outline-variant/5 flex items-center justify-between text-body-sm">
          <button
            onClick={markAllAsRead}
            className="text-primary hover:underline font-body-sm text-[13px]"
          >
            Mark all as read
          </button>
          <button
            onClick={clearAll}
            className="text-on-surface-variant hover:text-on-surface font-body-sm text-[13px]"
          >
            Clear all
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/5 p-2 scrollbar-none">
          {notifications.length === 0 ? (
            <div className="text-center py-16 px-6 text-on-surface-variant">
              <span className="material-symbols-outlined text-[40px] text-outline mb-2 block">
                notifications_off
              </span>
              <p className="font-card-title text-card-title text-on-surface mb-1">No notifications</p>
              <p className="text-body-sm">All operations are proceeding normally.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = iconMap[n.type] ?? iconMap.system;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id, n.link)}
                  className={clsx(
                    'p-4 rounded-xl transition-all cursor-pointer flex items-start gap-3.5 my-1',
                    n.read
                      ? 'bg-transparent hover:bg-surface-container'
                      : 'bg-surface-container/80 hover:bg-surface-container border border-outline-variant/10'
                  )}
                >
                  <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.color)}>
                    <span className="material-symbols-outlined text-[18px]">{cfg.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className={clsx('font-card-title text-card-title truncate', !n.read && 'text-primary font-semibold')}>
                        {n.title}
                      </p>
                      <span className="text-metadata font-metadata text-outline shrink-0">
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>
                    <p className="text-body-sm font-body-sm text-on-surface-variant line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/10 text-center">
          <Button variant="ghost" size="sm" onClick={() => { navigate('/audit-log'); toggleNotificationsPanel(); }}>
            View Full Audit Trail →
          </Button>
        </div>
      </div>
    </div>
  );
}

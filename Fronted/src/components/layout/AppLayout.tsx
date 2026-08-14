import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NotificationDrawer } from './NotificationDrawer';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';
import { useOperationsStore } from '@/store/operationsStore';
import { useSystemHealthStore } from '@/store/systemHealthStore';

export function AppLayout() {
  const loadAll = useOperationsStore((state) => state.loadAll);
  const refreshHealth = useSystemHealthStore((state) => state.refreshHealth);

  useEffect(() => {
    void loadAll();
    void refreshHealth();
  }, [loadAll, refreshHealth]);

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      {/* Background ambient orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="ambient-orb-primary w-[600px] h-[600px] -top-64 -left-32 opacity-60" />
        <div className="ambient-orb-accent w-[400px] h-[400px] bottom-0 right-0 opacity-40" />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="pl-72 flex flex-col min-h-screen w-full relative z-10">
        <TopBar />
        <main className="flex-1 p-8 max-w-[1440px] mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <NotificationDrawer />
      <ToastContainer />
    </div>
  );
}

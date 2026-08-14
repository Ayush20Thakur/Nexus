import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/authStore';

const LandingPage = lazy(() => import('@/pages/Landing'));
const LoginPage = lazy(() => import('@/pages/Login'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const InventoryPage = lazy(() => import('@/pages/Inventory'));
const RequestsPage = lazy(() => import('@/pages/Requests'));
const ApprovalsPage = lazy(() => import('@/pages/Approvals'));
const FulfillmentPage = lazy(() => import('@/pages/Fulfillment'));
const InsightsPage = lazy(() => import('@/pages/Insights'));
const CopilotPage = lazy(() => import('@/pages/Copilot'));
const DecisionEnginePage = lazy(() => import('@/pages/DecisionEngine'));
const AIEngineeringPage = lazy(() => import('@/pages/AIEngineering'));
const PolicyCenterPage = lazy(() => import('@/pages/PolicyCenter'));
const ReportsPage = lazy(() => import('@/pages/Reports'));
const AuditLogPage = lazy(() => import('@/pages/AuditLog'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const AdminConsolePage = lazy(() => import('@/pages/AdminConsole'));

let authenticatedRoutesPreloaded = false;

const authenticatedRoutePreloads = [
  () => import('@/pages/Dashboard'),
  () => import('@/pages/Inventory'),
  () => import('@/pages/Requests'),
  () => import('@/pages/Approvals'),
  () => import('@/pages/Fulfillment'),
  () => import('@/pages/Insights'),
  () => import('@/pages/Copilot'),
  () => import('@/pages/DecisionEngine'),
  () => import('@/pages/AIEngineering'),
  () => import('@/pages/PolicyCenter'),
  () => import('@/pages/Reports'),
  () => import('@/pages/AuditLog'),
  () => import('@/pages/Settings'),
  () => import('@/pages/AdminConsole'),
];

function preloadAuthenticatedRoutes() {
  if (authenticatedRoutesPreloaded) return;
  authenticatedRoutesPreloaded = true;
  void Promise.allSettled(authenticatedRoutePreloads.map((preload) => preload()));
}

function AppFallback({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center">
      <span className="text-label-caps font-label-caps text-on-surface-variant">{label}</span>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <AppFallback label="Authenticating" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const handle = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(preloadAuthenticatedRoutes)
      : window.setTimeout(preloadAuthenticatedRoutes, 300);
    return () => {
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [isAuthenticated]);

  return (
    <Suspense fallback={<AppFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/fulfillment" element={<FulfillmentPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/decision-engine" element={<DecisionEnginePage />} />
          <Route path="/ai-engineering" element={<AIEngineeringPage />} />
          <Route path="/policy-center" element={<PolicyCenterPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin-console" element={<AdminConsolePage />} />
          <Route path="/users" element={<AdminConsolePage />} />
          <Route path="/roles-permissions" element={<AdminConsolePage />} />
          <Route path="/system-configuration" element={<AdminConsolePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

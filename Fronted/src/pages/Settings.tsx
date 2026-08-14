import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import { APP_VERSION, APP_BUILD } from '@/constants/app';
import { getBackendPreferences, updateBackendPreferences, updateBackendProfile } from '@/api/settings';

export default function SettingsPage() {
  const { user, updateProfile } = useAuthStore();
  const { success, error } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName ?? 'Zian');
  const [department, setDepartment] = useState(user?.department ?? 'Engineering Admin');

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [critAlerts, setCritAlerts] = useState(true);
  const [aiInsights, setAiInsights] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

  useEffect(() => {
    getBackendPreferences()
      .then((prefs) => {
        setEmailAlerts(prefs.emailAlerts);
        setCritAlerts(prefs.critAlerts);
        setAiInsights(prefs.aiInsights);
        setTwoFactor(prefs.twoFactor);
      })
      .catch(() => undefined);
  }, []);

  const handleSave = async () => {
    try {
      const updated = await updateBackendProfile({
        displayName,
        department,
      });
      await updateBackendPreferences({
        emailAlerts,
        critAlerts,
        aiInsights,
        twoFactor,
      });
      updateProfile(updated);
      success('Settings Updated', 'User preferences and profile saved.');
    } catch {
      error('Settings Not Saved', 'The backend rejected the settings update.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <PageHeader
        title="Settings & Profile"
        subtitle="Manage your personal preferences, security keys, and alert subscriptions"
      >
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </PageHeader>

      {/* User Profile */}
      <GlassCard className="space-y-6">
        <h2 className="text-section-title font-section-title text-on-surface">Personal Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Input
            label="Corporate Email"
            type="email"
            value={user?.email ?? 'zian@nexus.corp'}
            disabled
            className="opacity-60"
          />
          <Input
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <Input
            label="Role (Assigned via RBAC)"
            value={user?.role ?? 'ADMIN'}
            disabled
            className="opacity-60"
          />
        </div>
      </GlassCard>

      {/* Security */}
      <GlassCard className="space-y-6">
        <h2 className="text-section-title font-section-title text-on-surface">Security & Authentication</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-outline-variant/10">
            <div>
              <p className="font-card-title text-card-title text-on-surface">Two-Factor Authentication (2FA)</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Enforce hardware key or TOTP token upon sign in.
              </p>
            </div>
            <input
              type="checkbox"
              checked={twoFactor}
              onChange={(e) => setTwoFactor(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-card-title text-card-title text-on-surface">Active Session Token</p>
              <p className="text-body-sm font-body-sm text-on-surface-variant">
                Bearer JWT token with zero-trust rotation.
              </p>
            </div>
            <span className="font-mono-data text-mono-data text-[12px] text-primary bg-surface-container px-3 py-1 rounded border border-outline-variant/20">
              Active · Auto-renews
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Notifications */}
      <GlassCard className="space-y-6">
        <h2 className="text-section-title font-section-title text-on-surface">Notification Channels</h2>
        <div className="space-y-4">
          {[
            {
              label: 'Critical Request Alerts',
              desc: 'Instant push alerts when CRITICAL priority requests arrive in Approvals.',
              val: critAlerts,
              setVal: setCritAlerts,
            },
            {
              label: 'Daily Executive Digest',
              desc: 'Daily operational summary email at 08:00 UTC.',
              val: emailAlerts,
              setVal: setEmailAlerts,
            },
            {
              label: 'AI Proactive Stockout Watch',
              desc: 'Alerts when the predictive engine detects impending stockout risks.',
              val: aiInsights,
              setVal: setAiInsights,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-2 border-b border-outline-variant/10 last:border-0"
            >
              <div>
                <p className="font-card-title text-card-title text-on-surface">{item.label}</p>
                <p className="text-body-sm font-body-sm text-on-surface-variant">{item.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={item.val}
                onChange={(e) => item.setVal(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </div>
          ))}
        </div>
      </GlassCard>

      {/* System Information */}
      <GlassCard>
        <h2 className="text-section-title font-section-title text-on-surface mb-3">System Build Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-body-sm">
          <div>
            <p className="text-metadata font-metadata text-on-surface-variant uppercase">Version</p>
            <p className="font-mono-data font-bold text-primary">v{APP_VERSION}</p>
          </div>
          <div>
            <p className="text-metadata font-metadata text-on-surface-variant uppercase">Build Target</p>
            <p className="font-mono-data text-on-surface">{APP_BUILD}</p>
          </div>
          <div>
            <p className="text-metadata font-metadata text-on-surface-variant uppercase">Cluster Node</p>
            <p className="font-mono-data text-on-surface">nexus-us-east-1</p>
          </div>
          <div>
            <p className="text-metadata font-metadata text-on-surface-variant uppercase">Engine</p>
            <p className="font-mono-data text-success-green font-bold">Vite + React TS</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

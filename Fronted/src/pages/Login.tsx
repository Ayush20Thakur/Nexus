import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { APP_VERSION } from '@/constants/app';
import { NexusLogo } from '@/components/ui/NexusLogo';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('zian@nexus.corp');
  const [password, setPassword] = useState('password');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    const state = useAuthStore.getState();
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
    if (state.isAuthenticated) navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      {/* WebGL-inspired animated background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-surface-container-lowest to-surface" />
        <div className="ambient-orb-primary w-[700px] h-[700px] top-[-200px] left-[-100px] opacity-30" />
        <div className="ambient-orb-accent w-[500px] h-[500px] bottom-[-100px] right-[-100px] opacity-25" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(228,226,227,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(228,226,227,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <NexusLogo size={64} />
          </div>
          <h1 className="text-page-title font-page-title text-on-surface mb-2 tracking-tight">
            NEXUS
          </h1>
          <p className="text-body-md font-body-md text-on-surface-variant">
            Operational Intelligence Platform
          </p>
          <p className="text-metadata font-metadata text-outline mt-1 font-mono-data">v{APP_VERSION} · Enterprise Edition</p>
        </div>

        {/* Card */}
        <div className="glass-level-3 rounded-2xl p-8 shadow-glass-lg">
          <h2 className="text-section-title font-section-title text-on-surface mb-2">Sign in</h2>
          <p className="text-body-sm font-body-sm text-on-surface-variant mb-8">
            Access your operational intelligence dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="email-input"
              label="Corporate Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@nexus.corp"
              leftIcon="alternate_email"
              autoComplete="email"
              required
            />

            <Input
              id="password-input"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              leftIcon="lock"
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-error-container/10 border border-error-red/20 rounded-lg">
                <span className="material-symbols-outlined text-error-red text-[18px]">error</span>
                <p className="text-body-sm font-body-sm text-error-red">{error}</p>
              </div>
            )}

            <Button
              id="login-btn"
              type="submit"
              variant="primary"
              loading={isLoading}
              className="w-full justify-center py-3 mt-2"
            >
              {isLoading ? 'Authenticating…' : 'Sign In'}
            </Button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-surface-container rounded-xl border border-outline-variant/10">
            <p className="text-label-caps font-label-caps text-outline uppercase mb-2">Supabase Credentials</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Email: <span className="text-primary font-mono-data text-mono-data">zian@nexus.corp</span>
            </p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">
              Password: <span className="text-primary font-mono-data text-mono-data">configured Auth password</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-metadata font-metadata text-outline mt-8 font-mono-data">
          © 2026 NEXUS Corp · Operational Intelligence · v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}

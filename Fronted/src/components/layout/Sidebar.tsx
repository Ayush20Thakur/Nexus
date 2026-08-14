import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { APP_VERSION } from '@/constants/app';
import { NexusLogo } from '@/components/ui/NexusLogo';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { clsx } from 'clsx';
import { updateBackendProfile } from '@/api/settings';

const NAV_SECTIONS = [
  {
    label: 'Operations',
    items: [
      { label: 'Overview', icon: 'dashboard', path: '/dashboard' },
      { label: 'Inventory', icon: 'inventory_2', path: '/inventory' },
      { label: 'Requests', icon: 'sync_alt', path: '/requests' },
      { label: 'Approvals', icon: 'verified', path: '/approvals' },
      { label: 'Fulfillment', icon: 'local_shipping', path: '/fulfillment' },
      { label: 'Insights', icon: 'analytics', path: '/insights' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'NEXUS Copilot', icon: 'smart_toy', path: '/copilot', isAI: true },
      { label: 'Decision Engine', icon: 'memory', path: '/decision-engine' },
      { label: 'AI Engineering', icon: 'architecture', path: '/ai-engineering' },
      { label: 'Policy Center', icon: 'policy', path: '/policy-center' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Reports', icon: 'description', path: '/reports' },
      { label: 'Audit Log', icon: 'history_edu', path: '/audit-log' },
      { label: 'Settings', icon: 'settings', path: '/settings' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Admin Console', icon: 'admin_panel_settings', path: '/admin-console' },
    ],
  },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuthStore();
  const { success, error } = useToast();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Profile edit form state
  const [editName, setEditName] = useState(user?.displayName ?? 'Zian');
  const [editDept, setEditDept] = useState(user?.department ?? 'Engineering Admin');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSaveProfile = async () => {
    try {
      const updated = await updateBackendProfile({ displayName: editName, department: editDept });
      updateProfile(updated);
      setProfileModalOpen(false);
      success('Profile Updated', 'User information saved successfully.');
    } catch {
      error('Profile Not Saved', 'The backend rejected the profile update.');
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low/80 backdrop-blur-2xl z-50 flex flex-col border-r border-outline-variant/10 shadow-2xl">
        {/* Logo Header */}
        <div className="flex items-center gap-stack-gap px-element-padding-md py-section-gap shrink-0 border-b border-outline-variant/5">
          <NexusLogo size={32} />
          <span className="text-page-title font-page-title tracking-tighter text-on-surface">
            NEXUS
          </span>
          <span className="ml-auto text-label-caps font-label-caps text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-mono-data">
            v{APP_VERSION}
          </span>
        </div>

        {/* Navigation List — Derived strictly from React Router location */}
        <nav className="flex-1 overflow-y-auto px-4 space-y-7 py-4 scrollbar-none">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-4 text-label-caps font-label-caps text-outline uppercase mb-2 tracking-wider">
                {section.label}
              </p>
              {section.items.map((item) => {
                const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path + '/'));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-150',
                      isActive
                        ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'
                    )}
                  >
                    <span
                      className={clsx(
                        'material-symbols-outlined text-[20px]',
                        (item as { isAI?: boolean }).isAI && 'text-ai-accent'
                      )}
                    >
                      {item.icon}
                    </span>
                    <span className="font-body-md text-body-md">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile Control with Popup Menu */}
        <div className="p-element-padding-md border-t border-outline-variant/10 bg-surface-container-low/50 shrink-0 relative" ref={menuRef}>
          {/* Popup Menu */}
          {menuOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-surface-container-high rounded-xl border border-outline-variant/20 shadow-glass-lg p-1.5 z-50 animate-slide-in space-y-1">
              <button
                onClick={() => { setMenuOpen(false); setProfileModalOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-body-sm text-on-surface hover:bg-surface-container transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px]">account_circle</span>
                User Profile
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-body-sm text-on-surface hover:bg-surface-container transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                Settings
              </button>
              <button
                onClick={() => { setMenuOpen(false); setShortcutsModalOpen(true); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-body-sm text-on-surface hover:bg-surface-container transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard</span>
                Keyboard Shortcuts
              </button>
              <div className="h-[1px] bg-outline-variant/10 my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-body-sm font-body-sm text-error-red hover:bg-error-container/20 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
              </button>
            </div>
          )}

          {/* User Button */}
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-4 py-3 bg-surface-container-high hover:bg-surface-variant transition-colors rounded-xl cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-card-title text-card-title text-on-surface truncate">
                {user?.displayName ?? 'Zian'}
              </span>
              <span className="text-metadata font-metadata text-on-surface-variant truncate">
                {user?.department ?? 'Engineering Admin'}
              </span>
            </div>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              {menuOpen ? 'expand_less' : 'unfold_more'}
            </span>
          </div>
        </div>
      </aside>

      {/* User Profile Modal */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title="User Profile"
        subtitle="Manage your identity in NEXUS"
        icon="account_circle"
      >
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label="Department"
            value={editDept}
            onChange={(e) => setEditDept(e.target.value)}
          />
          <Input
            label="Email"
            value={user?.email ?? 'zian@nexus.corp'}
            disabled
            className="opacity-60"
          />
          <Input
            label="Role"
            value={user?.role ?? 'ADMIN'}
            disabled
            className="opacity-60"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" onClick={() => setProfileModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <Modal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        title="Keyboard Shortcuts"
        subtitle="Quick navigation across NEXUS"
        icon="keyboard"
      >
        <div className="space-y-3">
          {[
            { key: '⌘K / Ctrl+K', desc: 'Open Command Palette' },
            { key: 'ESC', desc: 'Close open modal, drawer, or palette' },
            { key: '↑ / ↓', desc: 'Navigate list items in Command Palette' },
            { key: '↵ (Enter)', desc: 'Select or execute active command' },
          ].map((s) => (
            <div key={s.key} className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-body-sm font-body-sm text-on-surface">{s.desc}</span>
              <kbd className="font-mono-data text-mono-data text-[12px] bg-surface-container-high px-2 py-1 rounded border border-outline-variant/20 text-primary">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}

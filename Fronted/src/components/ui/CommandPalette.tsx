import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useOperationsStore } from '@/store/operationsStore';
import { useAuthStore } from '@/store/authStore';
import { clsx } from 'clsx';

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  category: 'Navigation' | 'Actions' | 'Requests' | 'Inventory';
  action: () => void;
}

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette } = useUIStore();
  const { requests, inventory } = useOperationsStore();
  const { logout } = useAuthStore();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Navigation Items
  const navItems: PaletteItem[] = [
    { id: 'dash', label: 'Overview / Dashboard', icon: 'dashboard', category: 'Navigation', action: () => navigate('/dashboard') },
    { id: 'inv', label: 'Inventory Management', icon: 'inventory_2', category: 'Navigation', action: () => navigate('/inventory') },
    { id: 'req', label: 'Operational Requests', icon: 'sync_alt', category: 'Navigation', action: () => navigate('/requests') },
    { id: 'appr', label: 'Approvals Queue', icon: 'verified', category: 'Navigation', action: () => navigate('/approvals') },
    { id: 'ful', label: 'Fulfillment Center', icon: 'local_shipping', category: 'Navigation', action: () => navigate('/fulfillment') },
    { id: 'ins', label: 'Operational Insights', icon: 'analytics', category: 'Navigation', action: () => navigate('/insights') },
    { id: 'cop', label: 'NEXUS Copilot', icon: 'smart_toy', category: 'Navigation', action: () => navigate('/copilot') },
    { id: 'dec', label: 'Decision Engine', icon: 'memory', category: 'Navigation', action: () => navigate('/decision-engine') },
    { id: 'ai', label: 'AI Engineering', icon: 'architecture', category: 'Navigation', action: () => navigate('/ai-engineering') },
    { id: 'pol', label: 'Policy Center', icon: 'policy', category: 'Navigation', action: () => navigate('/policy-center') },
    { id: 'rep', label: 'Reports & Analytics', icon: 'description', category: 'Navigation', action: () => navigate('/reports') },
    { id: 'aud', label: 'Audit Trail', icon: 'history_edu', category: 'Navigation', action: () => navigate('/audit-log') },
    { id: 'set', label: 'Settings & Profile', icon: 'settings', category: 'Navigation', action: () => navigate('/settings') },
    { id: 'adm', label: 'Admin Console', icon: 'admin_panel_settings', category: 'Navigation', action: () => navigate('/admin-console') },
  ];

  // Action Items
  const actionItems: PaletteItem[] = [
    {
      id: 'act-req',
      label: 'Create New Request',
      sublabel: 'Submit hardware or resource request',
      icon: 'add_circle',
      category: 'Actions',
      action: () => navigate('/requests?action=new'),
    },
    {
      id: 'act-inv',
      label: 'Add Inventory Item',
      sublabel: 'Register SKU to active zone',
      icon: 'add_box',
      category: 'Actions',
      action: () => navigate('/inventory?action=new'),
    },
    {
      id: 'act-rep',
      label: 'Generate Intelligence Report',
      sublabel: 'Export executive operational data',
      icon: 'download_for_offline',
      category: 'Actions',
      action: () => navigate('/reports?action=new'),
    },
    {
      id: 'act-sim',
      label: 'Run Decision Engine Simulation',
      sublabel: 'Evaluate rules against entered request data',
      icon: 'play_arrow',
      category: 'Actions',
      action: () => navigate('/decision-engine'),
    },
    {
      id: 'act-out',
      label: 'Sign Out',
      sublabel: 'Terminate active session',
      icon: 'logout',
      category: 'Actions',
      action: () => { logout(); navigate('/login'); },
    },
  ];

  // Live Requests Search
  const requestItems: PaletteItem[] = requests.map((r) => ({
    id: `req-${r.id}`,
    label: `${r.requestNumber}: ${r.title}`,
    sublabel: `${r.priority} · ${r.requester} (${r.status})`,
    icon: 'sync_alt',
    category: 'Requests',
    action: () => navigate('/requests'),
  }));

  // Live Inventory Search
  const inventoryItems: PaletteItem[] = inventory.map((i) => ({
    id: `inv-${i.id}`,
    label: `${i.sku} — ${i.name}`,
    sublabel: `${i.quantityOnHand} ${i.unit} in ${i.zone} (${i.status})`,
    icon: 'inventory_2',
    category: 'Inventory',
    action: () => navigate('/inventory'),
  }));

  const allItems = [...actionItems, ...navItems, ...requestItems, ...inventoryItems];

  const filtered = allItems.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandPaletteOpen ? closeCommandPalette() : useUIStore.getState().openCommandPalette();
      }
      if (!commandPaletteOpen) return;
      if (e.key === 'Escape') closeCommandPalette();
      if (e.key === 'ArrowDown') setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      if (e.key === 'ArrowUp') setActiveIdx((i) => Math.max(i - 1, 0));
      if (e.key === 'Enter' && filtered[activeIdx]) {
        filtered[activeIdx].action();
        closeCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, filtered, activeIdx, closeCommandPalette]);

  if (!commandPaletteOpen) return null;

  const grouped = filtered.reduce<Record<string, PaletteItem[]>>((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item];
    return acc;
  }, {});

  return (
    <div
      className="command-overlay"
      onClick={(e) => e.target === e.currentTarget && closeCommandPalette()}
    >
      <div className="command-panel">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-outline-variant/10">
          <span className="material-symbols-outlined text-[20px] text-on-surface-variant shrink-0">
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            placeholder="Search commands, requests, inventory, or pages…"
            className="flex-1 bg-transparent text-on-surface font-body-md text-body-md outline-none placeholder:text-on-surface-variant/50"
          />
          <kbd className="text-[10px] font-mono-data bg-surface-container px-2 py-1 rounded border border-outline-variant/20 text-on-surface-variant">
            ESC
          </kbd>
        </div>

        {/* Grouped Results */}
        <div className="max-h-[380px] overflow-y-auto p-2 scrollbar-none">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant text-body-md">
              No matching commands or entities for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-3">
                <p className="px-3 py-1 text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider">
                  {category}
                </p>
                {items.map((item) => {
                  const globalIdx = filtered.indexOf(item);
                  const isSelected = globalIdx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left my-0.5',
                        isSelected
                          ? 'bg-secondary-container text-on-secondary-container shadow-sm'
                          : 'text-on-surface hover:bg-surface-container-high'
                      )}
                      onClick={() => {
                        item.action();
                        closeCommandPalette();
                      }}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                    >
                      <span className={clsx('material-symbols-outlined text-[18px]',
                        item.category === 'Actions' ? 'text-primary' : 'text-on-surface-variant'
                      )}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-body-md text-body-md truncate">{item.label}</p>
                        {item.sublabel && (
                          <p className="text-metadata font-metadata text-on-surface-variant/80 truncate">
                            {item.sublabel}
                          </p>
                        )}
                      </div>
                      <span className="ml-auto text-metadata font-metadata opacity-60">
                        ↵
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-outline-variant/10 text-metadata font-metadata text-on-surface-variant bg-surface-container-low/40">
          <span className="flex items-center gap-1"><kbd className="bg-surface-container px-1.5 py-0.5 rounded text-[10px]">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="bg-surface-container px-1.5 py-0.5 rounded text-[10px]">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="bg-surface-container px-1.5 py-0.5 rounded text-[10px]">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

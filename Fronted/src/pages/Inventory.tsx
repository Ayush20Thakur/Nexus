import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBar, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InventoryStatusChip } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { useOperationsStore } from '@/store/operationsStore';
import { useToast } from '@/components/ui/Toast';
import { formatAbsoluteTime } from '@/utils/date';
import type { InventoryStatus, InventoryZone, InventoryItem } from '@/types';

const ZONES: InventoryZone[] = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
const STATUSES: InventoryStatus[] = ['OPTIMAL', 'LOW', 'CRITICAL', 'OVERSTOCK'];

export default function InventoryPage() {
  const { inventory, addInventoryItem, adjustStock } = useOperationsStore();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  // Add Item Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Computing');
  const [zone, setZone] = useState<InventoryZone>('Zone A');
  const [qty, setQty] = useState(50);
  const [maxCap, setMaxCap] = useState(200);
  const [unit, setUnit] = useState('units');

  // Stock Adjustment Modal
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(10);

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      const matchStatus = !statusFilter || item.status === statusFilter;
      const matchZone = !zoneFilter || item.zone === zoneFilter;
      return matchSearch && matchStatus && matchZone;
    });
  }, [inventory, search, statusFilter, zoneFilter]);

  const totals = useMemo(() => {
    return {
      items: inventory.length,
      optimal: inventory.filter((i) => i.status === 'OPTIMAL').length,
      low: inventory.filter((i) => i.status === 'LOW').length,
      critical: inventory.filter((i) => i.status === 'CRITICAL').length,
    };
  }, [inventory]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name) return;

    try {
      await addInventoryItem({
        sku: sku.toUpperCase(),
        name,
        category,
        zone,
        quantityOnHand: qty,
        quantityReserved: 0,
        reorderThreshold: Math.floor(maxCap * 0.25),
        maxCapacity: maxCap,
        unit,
        status: qty <= maxCap * 0.1 ? 'CRITICAL' : qty <= maxCap * 0.25 ? 'LOW' : 'OPTIMAL',
      });

      setAddModalOpen(false);
      setSku('');
      setName('');
      success('Inventory Registered', `${name} (${sku}) created in ${zone}.`);
    } catch {
      error('Inventory Not Saved', 'The backend rejected the inventory update.');
    }
  };

  const handleAdjustSubmit = async () => {
    if (!adjustModalItem) return;
    try {
      await adjustStock(adjustModalItem.id, adjustDelta);
      success('Stock Adjusted', `Adjusted ${adjustModalItem.name} by ${adjustDelta > 0 ? `+${adjustDelta}` : adjustDelta} ${adjustModalItem.unit}.`);
      setAdjustModalItem(null);
    } catch {
      error('Stock Not Adjusted', 'The backend rejected the stock adjustment.');
    }
  };

  const handleExportCSV = () => {
    const headers = 'SKU,Item Name,Category,Zone,On Hand,Reserved,Max Capacity,Status,Unit\n';
    const rows = inventory
      .map(
        (i) =>
          `"${i.sku}","${i.name}","${i.category}","${i.zone}",${i.quantityOnHand},${i.quantityReserved},${i.maxCapacity},"${i.status}","${i.unit}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    success('Export Generated', 'Inventory CSV export downloaded.');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Inventory Management"
        subtitle="Real-time stock levels, zones, and reorder tracking"
      >
        <Button
          variant="secondary"
          onClick={handleExportCSV}
          leftIcon={<span className="material-symbols-outlined text-[18px]">download</span>}
        >
          Export CSV
        </Button>
        <Button
          variant="primary"
          onClick={() => setAddModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
        >
          Add Item
        </Button>
      </PageHeader>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Items', value: totals.items, icon: 'inventory_2', accent: 'bg-primary/10 text-primary' },
          { label: 'Optimal', value: totals.optimal, icon: 'check_circle', accent: 'bg-success-green/10 text-success-green' },
          { label: 'Low Stock', value: totals.low, icon: 'warning', accent: 'bg-warning-amber/10 text-warning-amber' },
          { label: 'Critical', value: totals.critical, icon: 'error', accent: 'bg-error-red/10 text-error-red' },
        ].map((kpi) => (
          <GlassCard key={kpi.label} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.accent}`}>
              <span className="material-symbols-outlined text-[20px]">{kpi.icon}</span>
            </div>
            <div>
              <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">{kpi.label}</p>
              <p className="text-section-title font-section-title text-on-surface">{kpi.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filters Bar */}
      <GlassCard className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Search by name, SKU, or category…"
          className="flex-1"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-high border border-outline-variant/20 rounded-lg px-3 py-2 text-body-sm font-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            id="zone-filter"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-surface-container-high border border-outline-variant/20 rounded-lg px-3 py-2 text-body-sm font-body-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
          >
            <option value="">All Zones</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
          {(search || statusFilter || zoneFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setStatusFilter(''); setZoneFilter(''); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Inventory Table */}
      <GlassCard padding="none">
        <div className="overflow-x-auto">
          <table className="nexus-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Zone</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Stock Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const pct = Math.min(100, Math.round((item.quantityOnHand / item.maxCapacity) * 100));
                const variant =
                  item.status === 'OPTIMAL' ? 'success' : item.status === 'LOW' ? 'warning' : 'error';
                return (
                  <tr key={item.id}>
                    <td className="font-mono-data text-mono-data text-on-surface-variant font-bold">{item.sku}</td>
                    <td className="font-semibold text-on-surface">{item.name}</td>
                    <td className="text-on-surface-variant">{item.category}</td>
                    <td>
                      <span className="px-2 py-0.5 bg-surface-container-high rounded text-label-caps font-label-caps text-on-surface-variant border border-outline-variant/20">
                        {item.zone}
                      </span>
                    </td>
                    <td className="font-mono-data text-mono-data text-on-surface">
                      {item.quantityOnHand.toLocaleString()} {item.unit}
                    </td>
                    <td className="text-on-surface-variant">{item.quantityReserved}</td>
                    <td className="min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={pct} variant={variant} size="xs" className="flex-1" />
                        <span className="text-mono-data font-mono-data text-on-surface-variant text-[11px] w-8">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td><InventoryStatusChip status={item.status} /></td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setAdjustModalItem(item); setAdjustDelta(10); }}
                      >
                        Adjust
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[40px] text-outline mb-2 block">
                      search_off
                    </span>
                    <p className="font-card-title text-card-title text-on-surface mb-1">No items found</p>
                    <p className="text-body-sm">Try broadening your search or resetting filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between">
          <p className="text-body-sm font-body-sm text-on-surface-variant">
            Showing {filtered.length} of {inventory.length} items
          </p>
          <span className="text-metadata font-metadata text-outline">
            Last synced: {formatAbsoluteTime(new Date().toISOString(), 'HH:mm:ss')}
          </span>
        </div>
      </GlassCard>

      {/* Add Item Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Inventory Item"
        subtitle="Register a new component or SKU to a zone"
        icon="add_box"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU Code"
              placeholder="e.g. CPU-Z9-XL"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
            />
            <Input
              label="Category"
              placeholder="e.g. Computing"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>
          <Input
            label="Item Name"
            placeholder="e.g. Compute Nodes (Type-Z)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Zone
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as InventoryZone)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <Input
              label="Initial Quantity"
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              min={0}
              required
            />
            <Input
              label="Max Capacity"
              type="number"
              value={maxCap}
              onChange={(e) => setMaxCap(Number(e.target.value))}
              min={1}
              required
            />
          </div>
          <Input
            label="Unit of Measure"
            placeholder="e.g. units, reels, tubes"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      {adjustModalItem && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustModalItem(null)}
          title={`Adjust Stock: ${adjustModalItem.name}`}
          subtitle={`Current On Hand: ${adjustModalItem.quantityOnHand} ${adjustModalItem.unit}`}
          icon="tune"
        >
          <div className="space-y-4">
            <p className="text-body-sm text-on-surface-variant">
              Enter the adjustment amount (use positive numbers to add stock, negative to consume).
            </p>
            <Input
              label="Adjustment Delta"
              type="number"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(Number(e.target.value))}
              required
            />
            <div className="p-3 bg-surface-container rounded-lg text-body-sm">
              <span className="text-on-surface-variant">New Stock Level: </span>
              <span className="font-bold text-primary">
                {Math.max(0, adjustModalItem.quantityOnHand + adjustDelta)} {adjustModalItem.unit}
              </span>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <Button variant="secondary" onClick={() => setAdjustModalItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAdjustSubmit}>
                Confirm Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

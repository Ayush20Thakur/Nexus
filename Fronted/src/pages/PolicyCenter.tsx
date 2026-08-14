import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useOperationsStore } from '@/store/operationsStore';
import { useToast } from '@/components/ui/Toast';
import { clsx } from 'clsx';

export default function PolicyCenterPage() {
  const { policies, createPolicy, togglePolicyStatus } = useOperationsStore();
  const { success, error } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New Policy Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Procurement');
  const [version, setVersion] = useState('1.0');
  const [rule1, setRule1] = useState('');
  const [rule2, setRule2] = useState('');

  const categories = ['ALL', 'Procurement', 'Compliance', 'Inventory'];

  const filtered = useMemo(() => {
    return selectedCategory === 'ALL'
      ? policies
      : policies.filter((p) => p.category === selectedCategory);
  }, [policies, selectedCategory]);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const rules = [];
    if (rule1) rules.push({ description: rule1, isActive: true, scope: 'Global' });
    if (rule2) rules.push({ description: rule2, isActive: true, scope: 'Global' });

    try {
      await createPolicy({
        title,
        description,
        version,
        status: 'ACTIVE',
        category,
        rules,
        createdBy: 'Zian',
        updatedBy: 'Zian',
      });

      setCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setRule1('');
      setRule2('');
      success('Policy Published', `Policy "${title}" v${version} has been enacted.`);
    } catch {
      error('Policy Not Saved', 'The backend rejected the policy update.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Policy Center"
        subtitle="Organizational guardrails, automated governance rules, and compliance standards"
      >
        <Button
          variant="primary"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
        >
          Draft New Policy
        </Button>
      </PageHeader>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={clsx(
              'px-4 py-2 rounded-lg text-body-sm font-body-sm transition-all',
              selectedCategory === cat
                ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((policy) => (
          <GlassCard key={policy.id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-label-caps font-label-caps bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-mono-data">
                  {policy.category} · v{policy.version}
                </span>
                <StatusChip
                  status={policy.status === 'ACTIVE' ? 'success' : 'neutral'}
                  label={policy.status}
                />
              </div>

              <h3 className="text-section-title font-section-title text-on-surface mb-2">{policy.title}</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant mb-6">{policy.description}</p>

              <div className="space-y-3 mb-6">
                <span className="text-label-caps font-label-caps text-on-surface-variant uppercase block">
                  Enforced Rules ({policy.rules.length})
                </span>
                {policy.rules.map((r) => (
                  <div key={r.id} className="flex items-start gap-2.5 text-body-sm text-on-surface bg-surface-container p-3 rounded-lg">
                    <span className="material-symbols-outlined text-[18px] text-success-green shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <div>
                      <p>{r.description}</p>
                      <span className="text-metadata font-metadata text-on-surface-variant">Scope: {r.scope}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10 text-metadata font-metadata text-on-surface-variant">
              <span>Updated by {policy.updatedBy}</span>
              <Button
                variant={policy.status === 'ACTIVE' ? 'secondary' : 'primary'}
                size="sm"
                onClick={async () => {
                  try {
                    await togglePolicyStatus(policy.id);
                    success('Policy Updated', `${policy.title} status changed.`);
                  } catch {
                    error('Policy Not Updated', 'The backend rejected the policy status change.');
                  }
                }}
              >
                {policy.status === 'ACTIVE' ? 'Archive' : 'Enact Policy'}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Draft New Policy Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Draft Organizational Policy"
        subtitle="Establish automated compliance and operational thresholds"
        icon="policy"
      >
        <form onSubmit={handleCreatePolicy} className="space-y-4">
          <Input
            label="Policy Title"
            placeholder="e.g. Critical Safety Stock & Procurement Threshold"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the operational intent and enforcement criteria..."
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg p-3 outline-none border border-outline-variant/20 focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="Procurement">Procurement</option>
                <option value="Compliance">Compliance</option>
                <option value="Inventory">Inventory</option>
                <option value="Security">Security & Auth</option>
              </select>
            </div>
            <Input
              label="Version"
              placeholder="1.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3 p-3 bg-surface-container rounded-lg">
            <span className="text-label-caps font-label-caps text-on-surface uppercase block">
              Enforced Policy Rules
            </span>
            <Input
              label="Rule 1"
              placeholder="e.g. Dual-approval required for hardware purchase orders > $15,000."
              value={rule1}
              onChange={(e) => setRule1(e.target.value)}
              required
            />
            <Input
              label="Rule 2 (Optional)"
              placeholder="e.g. Emergency reserve stock cannot drop below 15% without VP sign-off."
              value={rule2}
              onChange={(e) => setRule2(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Enact Policy
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

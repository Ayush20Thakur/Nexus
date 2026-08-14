import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useOperationsStore } from '@/store/operationsStore';
import { useToast } from '@/components/ui/Toast';
import { operationsApi, type DecisionMetrics } from '@/api/operations';
import type { AIDecision, RequestPriority, RequestType, RuleCategory } from '@/types';
import { clsx } from 'clsx';

export default function DecisionEnginePage() {
  const { decisionRules, createDecisionRule, toggleDecisionRule } = useOperationsStore();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'rules' | 'simulation' | 'metrics'>('rules');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<DecisionMetrics | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // New Rule Form
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleCategory, setRuleCategory] = useState<RuleCategory>('REQUEST');
  const [rulePriority, setRulePriority] = useState(1);
  const [condField, setCondField] = useState('request.quantity');
  const [condOp, setCondOp] = useState<'eq' | 'gt' | 'lt' | 'lte' | 'gte'>('lte');
  const [condVal, setCondVal] = useState('50');
  const [actType, setActType] = useState<'APPROVE' | 'REJECT' | 'ESCALATE'>('APPROVE');

  // Simulation state
  const [simQuantity, setSimQuantity] = useState(30);
  const [simType, setSimType] = useState<RequestType>('STANDARD');
  const [simPriority, setSimPriority] = useState<RequestPriority>('NORMAL');
  const [simResult, setSimResult] = useState<{
    decision: AIDecision;
    confidence: number;
    reasoning: string;
    rulesTriggered: string[];
  } | null>(null);

  useEffect(() => {
    operationsApi.getDecisionMetrics()
      .then(setMetrics)
      .catch(() => undefined);
  }, [decisionRules]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName || !ruleDesc) return;

    try {
      await createDecisionRule({
        name: ruleName,
        description: ruleDesc,
        category: ruleCategory,
        status: 'ACTIVE',
        priority: rulePriority,
        conditions: [
          {
            field: condField,
            operator: condOp,
            value: isNaN(Number(condVal)) ? condVal : Number(condVal),
          },
        ],
        actions: [
          {
            type: actType,
            params: { autoFulfill: true },
          },
        ],
        createdBy: 'Zian',
      });

      setCreateModalOpen(false);
      setRuleName('');
      setRuleDesc('');
      success('Rule Created', `Decision rule "${ruleName}" is now active.`);
    } catch {
      error('Rule Not Saved', 'The backend rejected the decision rule.');
    }
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const result = await operationsApi.simulateDecision({
        type: simType,
        priority: simPriority,
        quantity: simQuantity,
      });
      setSimResult({
        decision: result.decision as AIDecision,
        confidence: result.confidence,
        reasoning: result.reasoning,
        rulesTriggered: result.rulesTriggered,
      });
    } catch {
      error('Simulation Failed', 'The backend could not evaluate the submitted parameters.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Decision Engine"
        subtitle="Configure autonomous logic, automated triggers, and simulation policies"
      >
        <div className="flex items-center gap-2 bg-surface-container rounded-lg p-1 border border-outline-variant/10">
          {(['rules', 'simulation', 'metrics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-1.5 rounded-md text-body-sm font-body-sm transition-all capitalize',
                activeTab === tab
                  ? 'bg-secondary-container text-on-secondary-container font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          onClick={() => setCreateModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
        >
          Create Rule
        </Button>
      </PageHeader>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <GlassCard className="flex items-center justify-between">
              <div>
                <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Active Rules</p>
                <p className="text-page-title font-page-title text-success-green">{metrics?.activeRules ?? decisionRules.filter((r) => r.status === 'ACTIVE').length}</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-success-green/40">memory</span>
            </GlassCard>
            <GlassCard className="flex items-center justify-between">
              <div>
                <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Rule Triggers (24h)</p>
                <p className="text-page-title font-page-title text-primary">{(metrics?.ruleTriggers ?? decisionRules.reduce((sum, rule) => sum + rule.triggerCount, 0)).toLocaleString()}</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-primary/40">bolt</span>
            </GlassCard>
            <GlassCard className="flex items-center justify-between">
              <div>
                <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Autonomous Accuracy</p>
                <p className="text-page-title font-page-title text-ai-accent">{metrics?.averageConfidence ?? 0}%</p>
              </div>
              <span className="material-symbols-outlined text-[32px] text-ai-accent/40">auto_mode</span>
            </GlassCard>
          </div>

          {decisionRules.map((rule) => (
            <GlassCard key={rule.id} className="relative overflow-hidden">
              <div
                className={clsx(
                  'absolute top-0 left-0 w-1 h-full',
                  rule.status === 'ACTIVE' ? 'bg-success-green' : 'bg-outline-variant/30'
                )}
              />
              <div className="pl-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-label-caps font-label-caps bg-surface-container-high text-on-surface-variant">
                      Priority {rule.priority}
                    </span>
                    <h3 className="text-card-title font-card-title text-on-surface">{rule.name}</h3>
                    <StatusChip
                      status={rule.status === 'ACTIVE' ? 'success' : 'neutral'}
                      label={rule.status}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-metadata font-metadata text-on-surface-variant">
                      Triggered {rule.triggerCount} times
                    </span>
                    <Button
                      variant={rule.status === 'ACTIVE' ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={async () => {
                        try {
                          await toggleDecisionRule(rule.id);
                          success('Rule Updated', `${rule.name} status changed.`);
                        } catch {
                          error('Rule Not Updated', 'The backend rejected the rule status change.');
                        }
                      }}
                    >
                      {rule.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>

                <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">{rule.description}</p>

                {/* Conditions & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container rounded-lg p-4 text-body-sm">
                  <div>
                    <span className="text-label-caps font-label-caps text-on-surface-variant uppercase block mb-2">
                      WHEN (Conditions)
                    </span>
                    <ul className="space-y-1">
                      {rule.conditions.map((c, i) => (
                        <li key={i} className="font-mono-data text-mono-data text-on-surface flex items-center gap-1.5">
                          <span className="text-primary">•</span>
                          {c.field} <span className="text-warning-amber font-bold">{c.operator}</span> {String(c.value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-label-caps font-label-caps text-on-surface-variant uppercase block mb-2">
                      THEN (Actions)
                    </span>
                    <ul className="space-y-1">
                      {rule.actions.map((a, i) => (
                        <li key={i} className="font-mono-data text-mono-data text-success-green flex items-center gap-1.5">
                          <span>→</span>
                          {a.type} ({JSON.stringify(a.params)})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Simulation Tab */}
      {activeTab === 'simulation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-6">
            <GlassCard>
              <h2 className="text-section-title font-section-title text-on-surface mb-4">Input Parameters</h2>
              <div className="space-y-4">
                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">
                    Request Type
                  </label>
                  <select
                    value={simType}
                    onChange={(e) => setSimType(e.target.value as RequestType)}
                    className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-3 text-body-md text-on-surface outline-none"
                  >
                    <option value="STANDARD">Standard Transfer</option>
                    <option value="PURCHASE">Procurement / Purchase</option>
                    <option value="EMERGENCY">Emergency Response</option>
                    <option value="MAINTENANCE">Scheduled Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-2">
                    Priority Level
                  </label>
                  <select
                    value={simPriority}
                    onChange={(e) => setSimPriority(e.target.value as RequestPriority)}
                    className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-3 text-body-md text-on-surface outline-none"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical (Immediate SLA)</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                      Requested Quantity
                    </label>
                    <span className="font-mono-data text-mono-data text-primary font-bold">{simQuantity} units</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="150"
                    value={simQuantity}
                    onChange={(e) => setSimQuantity(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <Button variant="primary" onClick={runSimulation} loading={isSimulating} className="w-full justify-center mt-4">
                  Run Policy Simulation
                </Button>
              </div>
            </GlassCard>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <GlassCard>
              <h2 className="text-section-title font-section-title text-on-surface mb-4">Simulation Outcome</h2>
              {simResult ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
                    <div>
                      <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Decision</p>
                      <p
                        className={clsx(
                          'text-page-title font-page-title',
                          simResult.decision === 'APPROVE'
                            ? 'text-success-green'
                            : simResult.decision === 'REJECT'
                            ? 'text-error-red'
                            : 'text-warning-amber'
                        )}
                      >
                        {simResult.decision}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-label-caps font-label-caps text-on-surface-variant uppercase">Confidence</p>
                      <p className="text-page-title font-page-title text-primary">{simResult.confidence}%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-2">Decision Reasoning</p>
                    <p className="text-body-md font-body-md text-on-surface bg-surface-container p-4 rounded-xl border border-outline-variant/10">
                      {simResult.reasoning}
                    </p>
                  </div>

                  <div>
                    <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-2">Applied Rules</p>
                    <div className="space-y-2">
                      {simResult.rulesTriggered.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-body-sm text-on-surface bg-surface-container p-2.5 rounded-lg"
                        >
                          <span className="material-symbols-outlined text-[18px] text-ai-accent">check_circle</span>
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-on-surface-variant">
                  Run a simulation to view outcome
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard>
            <h3 className="text-card-title font-card-title text-on-surface mb-3">Automation Rate</h3>
            <p className="text-page-title font-page-title text-primary mb-2">{metrics?.automationRate ?? 0}%</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">Requests whose decision outcome is automatic approval.</p>
            <ProgressBar value={metrics?.automationRate ?? 0} variant="success" size="sm" className="mt-4" />
          </GlassCard>
          <GlassCard>
            <h3 className="text-card-title font-card-title text-on-surface mb-3">Manual Review Queue</h3>
            <p className="text-page-title font-page-title text-warning-amber mb-2">{metrics?.manualReviewQueue ?? 0}</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">Pending requests routed to review or escalation.</p>
            <ProgressBar value={Math.min(100, (metrics?.manualReviewQueue ?? 0) * 10)} variant="warning" size="sm" className="mt-4" />
          </GlassCard>
          <GlassCard>
            <h3 className="text-card-title font-card-title text-on-surface mb-3">Rule Coverage</h3>
            <p className="text-page-title font-page-title text-success-green mb-2">{metrics?.ruleCoverage ?? 0}%</p>
            <p className="text-body-sm font-body-sm text-on-surface-variant">Decision outcomes linked to a configured rule.</p>
            <ProgressBar value={metrics?.ruleCoverage ?? 0} variant="success" size="sm" className="mt-4" />
          </GlassCard>
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Autonomous Decision Rule"
        subtitle="Define condition-action logic for automated request processing"
        icon="memory"
      >
        <form onSubmit={handleCreateRule} className="space-y-4">
          <Input
            label="Rule Name"
            placeholder="e.g. Auto-Escalate High-Value Purchase Orders"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            required
          />
          <Input
            label="Description"
            placeholder="Explain what conditions trigger this rule..."
            value={ruleDesc}
            onChange={(e) => setRuleDesc(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Category
              </label>
              <select
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value as RuleCategory)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="REQUEST">Request Workflow</option>
                <option value="INVENTORY">Inventory Threshold</option>
                <option value="ESCALATION">Escalation Protocol</option>
                <option value="FULFILLMENT">Fulfillment Dispatch</option>
              </select>
            </div>
            <Input
              label="Priority Level (0 = highest)"
              type="number"
              value={rulePriority}
              onChange={(e) => setRulePriority(Number(e.target.value))}
              min={0}
              max={10}
              required
            />
          </div>

          <div className="p-4 bg-surface-container rounded-xl space-y-3">
            <span className="text-label-caps font-label-caps text-on-surface uppercase block">
              Logic Definition
            </span>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Field"
                value={condField}
                onChange={(e) => setCondField(e.target.value)}
                required
              />
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                  Operator
                </label>
                <select
                  value={condOp}
                  onChange={(e) => setCondOp(e.target.value as 'eq' | 'gt' | 'lt' | 'lte' | 'gte')}
                  className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
                >
                  <option value="lte">&le; (Less than / eq)</option>
                  <option value="gte">&ge; (Greater than / eq)</option>
                  <option value="eq">= (Equal to)</option>
                  <option value="gt">&gt; (Greater than)</option>
                  <option value="lt">&lt; (Less than)</option>
                </select>
              </div>
              <Input
                label="Value"
                value={condVal}
                onChange={(e) => setCondVal(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Action Output
              </label>
              <select
                value={actType}
                onChange={(e) => setActType(e.target.value as 'APPROVE' | 'REJECT' | 'ESCALATE')}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="APPROVE">APPROVE (Auto-authorize)</option>
                <option value="ESCALATE">ESCALATE (Escalate to Manager)</option>
                <option value="REJECT">REJECT (Auto-decline)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

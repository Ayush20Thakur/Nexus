import { useState, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useOperationsStore } from '@/store/operationsStore';
import { useToast } from '@/components/ui/Toast';
import { formatRelativeTime } from '@/utils/date';
import type { Approval } from '@/types';
import { clsx } from 'clsx';

export default function ApprovalsPage() {
  const { approvals, approveApproval, rejectApproval, clarifyApproval } = useOperationsStore();
  const { success, error, info } = useToast();

  // Action Modals
  const [rejectingApproval, setRejectingApproval] = useState<Approval | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [clarifyingApproval, setClarifyingApproval] = useState<Approval | null>(null);
  const [clarifyMessage, setClarifyMessage] = useState('');

  const pending = useMemo(() => approvals.filter((a) => a.status === 'PENDING'), [approvals]);
  const resolved = useMemo(() => approvals.filter((a) => a.status !== 'PENDING'), [approvals]);

  const handleApprove = async (appr: Approval) => {
    try {
      await approveApproval(appr.id);
      success('Approval Granted', `${appr.requestNumber} approved. Dispatched to Fulfillment Queue.`);
    } catch {
      error('Approval Failed', 'The backend rejected the approval action.');
    }
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingApproval || !rejectReason.trim()) return;

    try {
      await rejectApproval(rejectingApproval.id, rejectReason.trim());
      error('Request Rejected', `${rejectingApproval.requestNumber} has been rejected.`);
      setRejectingApproval(null);
      setRejectReason('');
    } catch {
      error('Rejection Failed', 'The backend rejected the rejection action.');
    }
  };

  const handleClarifyConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarifyingApproval || !clarifyMessage.trim()) return;

    try {
      await clarifyApproval(clarifyingApproval.id, clarifyMessage.trim());
      info('Clarification Dispatched', `Message sent to ${clarifyingApproval.requester}.`);
      setClarifyingApproval(null);
      setClarifyMessage('');
    } catch {
      error('Clarification Failed', 'The backend rejected the clarification action.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Approvals"
        subtitle="Human authorization for decisions requiring executive or managerial approval."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Pending Approval Cards */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {pending.length === 0 && (
            <GlassCard className="py-16 text-center">
              <span className="material-symbols-outlined text-[48px] text-success-green mb-2 block">
                verified
              </span>
              <p className="text-section-title font-section-title text-on-surface mb-1">All caught up!</p>
              <p className="text-body-md font-body-md text-on-surface-variant">
                No requests currently require authorization.
              </p>
            </GlassCard>
          )}

          {pending.map((appr) => {
            const availPct = Math.min(100, Math.round((appr.availableStock / appr.quantity) * 100));
            const procPct = Math.min(100, Math.round((appr.procureQuantity / appr.quantity) * 100));

            return (
              <div
                key={appr.id}
                className="bg-surface-container-low rounded-xl shadow-md overflow-hidden relative group border border-outline-variant/10"
              >
                {/* Priority accent line */}
                <div
                  className={clsx(
                    'absolute top-0 left-0 w-1 h-full',
                    appr.priority === 'CRITICAL' ? 'bg-error-red' : 'bg-warning-amber'
                  )}
                />

                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <span
                        className={clsx(
                          'px-2 py-1 rounded-md text-label-caps font-label-caps tracking-wider',
                          appr.priority === 'CRITICAL'
                            ? 'bg-error-container/30 text-error-red font-bold'
                            : 'bg-warning-amber/10 text-warning-amber'
                        )}
                      >
                        {appr.priority}
                      </span>
                      <span className="text-mono-data font-mono-data text-on-surface-variant font-bold">
                        {appr.requestNumber}
                      </span>
                    </div>
                    <span className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {formatRelativeTime(appr.createdAt)}
                    </span>
                  </div>

                  {/* Request Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <h3 className="text-card-title font-card-title text-on-surface mb-1">{appr.title}</h3>
                      <p className="text-body-sm font-body-sm text-on-surface-variant">
                        Quantity:{' '}
                        <span className="text-on-surface font-semibold">
                          {appr.quantity} {appr.unit}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-on-surface-variant">person</span>
                      </div>
                      <div>
                        <p className="text-body-md font-body-md text-on-surface font-semibold">
                          {appr.requester}
                        </p>
                        <p className="text-metadata font-metadata text-on-surface-variant">
                          {appr.requesterDept}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* NEXUS AI Recommendation Box */}
                  <div className="bg-surface-container rounded-lg p-5 mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                    <div className="flex items-center gap-2 mb-3">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                      </span>
                      <span className="text-label-caps font-label-caps text-primary tracking-widest uppercase">
                        NEXUS Recommendation
                      </span>
                      <span className="ml-auto text-label-caps font-label-caps text-on-surface-variant">
                        Confidence: {appr.aiConfidence}%
                      </span>
                    </div>
                    <p className="text-body-md font-body-md text-on-surface mb-4">
                      {appr.aiRecommendation}
                    </p>

                    {/* Stock Analysis Meter */}
                    <div className="flex items-center justify-between text-metadata font-metadata text-on-surface-variant mb-2">
                      <span>Decision Stock Analysis (Requested: {appr.quantity})</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden flex">
                      <div
                        className="bg-success-green h-full"
                        style={{ width: `${availPct}%` }}
                        title={`Available: ${appr.availableStock}`}
                      />
                      <div
                        className="bg-warning-amber h-full"
                        style={{ width: `${procPct}%` }}
                        title={`Procure: ${appr.procureQuantity}`}
                      />
                      <div className="bg-surface-variant h-full flex-1" />
                    </div>
                    <div className="flex justify-between text-metadata font-metadata text-on-surface-variant mt-2">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-success-green" /> {appr.availableStock} Avail
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-warning-amber" /> {appr.procureQuantity} Procure
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-surface-variant" /> {appr.safetyStock} Safety Stock
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setClarifyingApproval(appr); setClarifyMessage(''); }}
                    >
                      Clarify
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => { setRejectingApproval(appr); setRejectReason(''); }}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleApprove(appr)}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Resolved Queue */}
          {resolved.length > 0 && (
            <div className="mt-6">
              <p className="text-label-caps font-label-caps text-outline uppercase mb-3">
                Recently Resolved Approvals
              </p>
              <div className="space-y-3">
                {resolved.map((appr) => (
                  <GlassCard key={appr.id} className="flex items-center justify-between opacity-75">
                    <div className="flex items-center gap-3">
                      <span
                        className={clsx(
                          'material-symbols-outlined text-[20px]',
                          appr.status === 'APPROVED' ? 'text-success-green' : 'text-error-red'
                        )}
                      >
                        {appr.status === 'APPROVED' ? 'check_circle' : 'cancel'}
                      </span>
                      <div>
                        <p className="font-card-title text-card-title text-on-surface">{appr.title}</p>
                        <p className="text-metadata font-metadata text-on-surface-variant">
                          {appr.requestNumber} · {appr.requester}
                          {appr.decisionNote && ` · Note: ${appr.decisionNote}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={clsx(
                        'text-label-caps font-label-caps font-bold px-2.5 py-1 rounded-full border',
                        appr.status === 'APPROVED'
                          ? 'bg-success-green/10 text-success-green border-success-green/20'
                          : 'bg-error-red/10 text-error-red border-error-red/20'
                      )}
                    >
                      {appr.status}
                    </span>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4 space-y-4">
          <GlassCard>
            <h3 className="text-section-title font-section-title text-on-surface mb-4">Queue Summary</h3>
            {[
              { label: 'Pending Authorizations', value: pending.length, color: 'text-warning-amber' },
              { label: 'Approved Resolved', value: resolved.filter((a) => a.status === 'APPROVED').length, color: 'text-success-green' },
              { label: 'Rejected Resolved', value: resolved.filter((a) => a.status === 'REJECTED').length, color: 'text-error-red' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0">
                <span className="text-body-sm font-body-sm text-on-surface-variant">{row.label}</span>
                <span className={clsx('text-section-title font-section-title', row.color)}>{row.value}</span>
              </div>
            ))}
          </GlassCard>

          <GlassCard>
            <h3 className="text-card-title font-card-title text-on-surface mb-2">AI Copilot Analysis</h3>
            <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">
              NEXUS Decision Core evaluates request risks against real-time supply chain constraints.
            </p>
            <div className="p-3 bg-surface-container rounded-lg text-body-sm">
              <span className="text-label-caps font-label-caps text-ai-accent block mb-1">Policy Guardrail</span>
              <span className="text-on-surface">Auto-escalates orders exceeding $10k or CRITICAL priority.</span>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectingApproval && (
        <Modal
          isOpen={true}
          onClose={() => setRejectingApproval(null)}
          title={`Reject Request: ${rejectingApproval.requestNumber}`}
          subtitle={rejectingApproval.title}
          icon="cancel"
        >
          <form onSubmit={handleRejectConfirm} className="space-y-4">
            <p className="text-body-sm text-on-surface-variant">
              Please specify the operational rationale for rejecting this request.
            </p>
            <Input
              label="Rejection Reason"
              placeholder="e.g. Insufficient budget allocation for Q3."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
              autoFocus
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <Button variant="secondary" type="button" onClick={() => setRejectingApproval(null)}>
                Cancel
              </Button>
              <Button variant="danger" type="submit">
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Clarify Modal */}
      {clarifyingApproval && (
        <Modal
          isOpen={true}
          onClose={() => setClarifyingApproval(null)}
          title={`Request Clarification: ${clarifyingApproval.requestNumber}`}
          subtitle={`To: ${clarifyingApproval.requester}`}
          icon="chat"
        >
          <form onSubmit={handleClarifyConfirm} className="space-y-4">
            <p className="text-body-sm text-on-surface-variant">
              Specify what additional information or documentation is needed.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Please clarify if the hardware is for Zone A or Zone B..."
              value={clarifyMessage}
              onChange={(e) => setClarifyMessage(e.target.value)}
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg p-3 outline-none border border-outline-variant/20 focus:ring-1 focus:ring-primary/50"
              required
              autoFocus
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
              <Button variant="secondary" type="button" onClick={() => setClarifyingApproval(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Send Message
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchBar, Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RequestStatusChip, PriorityChip } from '@/components/ui/StatusChip';
import { Modal } from '@/components/ui/Modal';
import { RequestDetailModal } from '@/components/operations/RequestDetailModal';
import { useOperationsStore } from '@/store/operationsStore';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import { formatRelativeTime } from '@/utils/date';
import type { OperationalRequest, RequestPriority, RequestType } from '@/types';
import { clsx } from 'clsx';

export default function RequestsPage() {
  const [searchParams] = useSearchParams();
  const { requests, createRequest } = useOperationsStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<OperationalRequest | null>(null);
  const [autoLoadInference, setAutoLoadInference] = useState(false);

  // New Request Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<RequestType>('STANDARD');
  const [priority, setPriority] = useState<RequestPriority>('NORMAL');
  const [quantity, setQuantity] = useState(15);
  const [department, setDepartment] = useState(user?.department ?? 'Engineering');

  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setNewModalOpen(true);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        r.title.toLowerCase().includes(q) ||
        r.requestNumber.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q);
      const matchStatus = !statusFilter || r.status === statusFilter;
      const matchPriority = !priorityFilter || r.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [requests, search, statusFilter, priorityFilter]);

  const counts = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'PENDING').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      critical: requests.filter((r) => r.priority === 'CRITICAL').length,
    };
  }, [requests]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    try {
      const created = await createRequest({
        title,
        description,
        type,
        priority,
        requester: user?.displayName ?? 'Zian',
        requesterDept: department,
        quantity,
      });

      setNewModalOpen(false);
      setTitle('');
      setDescription('');
      success('Request Submitted', `${created.requestNumber} created and routed to Approvals.`);
    } catch {
      error('Request Not Submitted', 'The backend rejected the request.');
    }
  };

  const openRequestDetails = (request: OperationalRequest, infer = false) => {
    setAutoLoadInference(infer);
    setSelectedReq(request);
  };

  const closeRequestDetails = () => {
    setSelectedReq(null);
    setAutoLoadInference(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Operational Requests"
        subtitle="Track, manage, and action all operational requests"
      >
        <Button
          variant="primary"
          onClick={() => setNewModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-[18px]">add</span>}
        >
          New Request
        </Button>
      </PageHeader>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Requests',
            value: counts.total,
            color: 'text-primary',
            onClick: () => {
              setStatusFilter('');
              setPriorityFilter('');
            },
          },
          {
            label: 'Pending Queue',
            value: counts.pending,
            color: 'text-warning-amber',
            onClick: () => {
              setPriorityFilter('');
              setStatusFilter('PENDING');
            },
          },
          {
            label: 'Approved',
            value: counts.approved,
            color: 'text-success-green',
            onClick: () => {
              setPriorityFilter('');
              setStatusFilter('APPROVED');
            },
          },
          {
            label: 'Critical Priority',
            value: counts.critical,
            color: 'text-error-red',
            onClick: () => {
              setStatusFilter('');
              setPriorityFilter('CRITICAL');
            },
          },
        ].map((s) => (
          <GlassCard key={s.label} hover onClick={s.onClick} className="text-center cursor-pointer">
            <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">{s.label}</p>
            <p className={clsx('text-page-title font-page-title', s.color)}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters Bar */}
      <GlassCard className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch('')}
          placeholder="Search requests by title, number, or requester…"
          className="flex-1"
        />
        <div className="flex items-center gap-3 flex-wrap">
          <select
            id="req-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-high border border-outline-variant/20 rounded-lg px-3 py-2 text-body-sm text-on-surface outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            {['PENDING', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            id="req-priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface-container-high border border-outline-variant/20 rounded-lg px-3 py-2 text-body-sm text-on-surface outline-none cursor-pointer"
          >
            <option value="">All Priorities</option>
            {['CRITICAL', 'HIGH', 'NORMAL', 'LOW'].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {(search || statusFilter || priorityFilter) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Requests List */}
      <div className="space-y-4">
        {filtered.map((req) => (
          <GlassCard
            key={req.id}
            hover
            onClick={() => openRequestDetails(req)}
            className="relative overflow-hidden cursor-pointer"
          >
            {/* Priority accent line */}
            <div
              className={clsx(
                'absolute top-0 left-0 w-1 h-full',
                req.priority === 'CRITICAL' ? 'bg-error-red' :
                req.priority === 'HIGH' ? 'bg-warning-amber' : 'bg-surface-container-high'
              )}
            />

            <div className="pl-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <PriorityChip priority={req.priority} />
                      <span className="text-mono-data font-mono-data text-on-surface-variant font-bold">
                        {req.requestNumber}
                      </span>
                    </div>
                    <h3 className="text-card-title font-card-title text-on-surface mb-0.5">{req.title}</h3>
                    <p className="text-body-sm font-body-sm text-on-surface-variant">{req.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RequestStatusChip status={req.status} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      openRequestDetails(req, true);
                    }}
                  >
                    AI Inference
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      openRequestDetails(req);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Requester</p>
                  <p className="text-body-sm font-body-sm text-on-surface">{req.requester}</p>
                  <p className="text-metadata font-metadata text-on-surface-variant">{req.requesterDept}</p>
                </div>
                <div>
                  <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Type</p>
                  <p className="text-body-sm font-body-sm text-on-surface">{req.type}</p>
                </div>
                <div>
                  <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Quantity</p>
                  <p className="text-body-sm font-body-sm text-on-surface">
                    {req.quantity !== undefined ? `${req.quantity} units` : 'Unspecified'}
                  </p>
                </div>
                <div>
                  <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Submitted</p>
                  <p className="text-body-sm font-body-sm text-on-surface">
                    {formatRelativeTime(req.createdAt)}
                  </p>
                </div>
              </div>

              {/* AI Recommendation Box */}
              <div className="bg-surface-container rounded-lg p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-[18px] text-ai-accent mt-0.5">smart_toy</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-label-caps font-label-caps text-ai-accent uppercase">
                      NEXUS AI Recommendation
                    </span>
                    <span className="text-metadata font-metadata text-on-surface-variant">
                      Confidence: {req.aiConfidence}%
                    </span>
                  </div>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">{req.aiReasoning}</p>
                  {req.rejectionReason && (
                    <p className="text-body-sm font-body-sm text-error-red mt-2 font-semibold">
                      Rejection Reason: {req.rejectionReason}
                    </p>
                  )}
                  {req.clarifyMessage && (
                    <p className="text-body-sm font-body-sm text-warning-amber mt-2 font-semibold">
                      Clarification: {req.clarifyMessage}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  <span
                    className={clsx(
                      'px-2 py-1 rounded text-label-caps font-label-caps font-bold',
                      req.aiDecision === 'APPROVE'
                        ? 'bg-success-green/10 text-success-green'
                        : req.aiDecision === 'REJECT'
                        ? 'bg-error-red/10 text-error-red'
                        : 'bg-warning-amber/10 text-warning-amber'
                    )}
                  >
                    {req.aiDecision}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}

        {filtered.length === 0 && (
          <GlassCard className="py-16 text-center">
            <span className="material-symbols-outlined text-[48px] text-outline mb-2 block">inbox</span>
            <p className="text-section-title font-section-title text-on-surface mb-1">No requests found</p>
            <p className="text-body-md font-body-md text-on-surface-variant">Try adjusting your filters or search query.</p>
          </GlassCard>
        )}
      </div>

      {/* New Request Modal */}
      <Modal
        isOpen={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title="Create Operational Request"
        subtitle="Submit a hardware, procurement, or maintenance request"
        icon="add_circle"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Request Title"
            placeholder="e.g. Compute Nodes (Type-Z) Cluster Expansion"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div>
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
              Description & Justification
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the technical requirement and urgency..."
              className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg p-3 outline-none border border-outline-variant/20 focus:ring-1 focus:ring-primary/50"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Request Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as RequestType)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="STANDARD">Standard Replenishment</option>
                <option value="PURCHASE">Procurement / Purchase</option>
                <option value="EMERGENCY">Emergency Response</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="TRANSFER">Inter-Zone Transfer</option>
              </select>
            </div>
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical (Immediate Human Approval)</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
              required
            />
            <Input
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" type="button" onClick={() => setNewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      <RequestDetailModal
        request={selectedReq}
        onClose={closeRequestDetails}
        autoLoadInference={autoLoadInference}
      />
    </div>
  );
}

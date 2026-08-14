import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PriorityChip, RequestStatusChip } from '@/components/ui/StatusChip';
import { useToast } from '@/components/ui/Toast';
import { getEntityInference, type CopilotEntityInference } from '@/api/copilot';
import { formatAbsoluteTime } from '@/utils/date';
import type { OperationalRequest } from '@/types';

interface RequestDetailModalProps {
  request: OperationalRequest | null;
  onClose: () => void;
  autoLoadInference?: boolean;
}

const riskClasses: Record<CopilotEntityInference['riskLevel'], string> = {
  LOW: 'bg-success-green/10 text-success-green border-success-green/20',
  MEDIUM: 'bg-primary/10 text-primary border-primary/20',
  HIGH: 'bg-warning-amber/10 text-warning-amber border-warning-amber/20',
  CRITICAL: 'bg-error-red/10 text-error-red border-error-red/20',
};

function DetailField({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div>
      <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">{label}</p>
      <p className="text-body-sm font-body-sm text-on-surface">{value ?? 'Not recorded'}</p>
    </div>
  );
}

export function RequestDetailModal({ request, onClose, autoLoadInference = false }: RequestDetailModalProps) {
  const navigate = useNavigate();
  const { error } = useToast();
  const [inference, setInference] = useState<CopilotEntityInference | null>(null);
  const [isInferenceLoading, setIsInferenceLoading] = useState(false);
  const loadedRequestRef = useRef<string | null>(null);

  const loadInference = useCallback(async () => {
    if (!request || isInferenceLoading) return;
    setIsInferenceLoading(true);
    try {
      const result = await getEntityInference('request', request.id);
      setInference(result);
      loadedRequestRef.current = request.id;
    } catch {
      error('Inference Failed', 'The backend could not calculate inference for this request.');
    } finally {
      setIsInferenceLoading(false);
    }
  }, [error, isInferenceLoading, request]);

  useEffect(() => {
    setInference(null);
    loadedRequestRef.current = null;
  }, [request?.id]);

  useEffect(() => {
    if (autoLoadInference && request && loadedRequestRef.current !== request.id) {
      void loadInference();
    }
  }, [autoLoadInference, loadInference, request]);

  if (!request) return null;

  const fallbackPrompt = `Give me more detail about request ${request.requestNumber}. Explain the risk, approval path, inventory impact, and next action.`;
  const openCopilot = () => {
    const prompt = inference?.chatPrompt ?? fallbackPrompt;
    onClose();
    navigate(`/copilot?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Request Dossier: ${request.requestNumber}`}
      subtitle={request.title}
      icon="description"
      maxWidth="xl"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-surface-container p-4 rounded-xl">
          <div>
            <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Status</p>
            <RequestStatusChip status={request.status} />
          </div>
          <div>
            <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Priority</p>
            <PriorityChip priority={request.priority} />
          </div>
          <DetailField label="Requester" value={`${request.requester} / ${request.requesterDept}`} />
          <DetailField label="Created" value={request.createdAt ? formatAbsoluteTime(request.createdAt) : undefined} />
          <DetailField label="Type" value={request.type} />
          <DetailField label="Quantity" value={request.quantity !== undefined ? `${request.quantity} units` : undefined} />
          <DetailField label="Assignee" value={request.assignee} />
          <DetailField label="Inventory Item" value={request.inventoryItem} />
        </div>

        <div>
          <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Description</p>
          <p className="text-body-md font-body-md text-on-surface bg-surface-container p-3 rounded-lg">
            {request.description}
          </p>
        </div>

        <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/10">
          <div className="flex items-start justify-between gap-4 mb-2">
            <span className="text-label-caps font-label-caps text-ai-accent uppercase">
              Stored Decision Engine Analysis
            </span>
            <span className="text-metadata font-metadata text-on-surface-variant">
              Confidence: {request.aiConfidence ?? 0}%
            </span>
          </div>
          <p className="text-body-sm font-body-sm text-on-surface-variant">{request.aiReasoning}</p>
          <div className="mt-3">
            <span
              className={clsx(
                'px-2 py-1 rounded text-label-caps font-label-caps font-bold',
                request.aiDecision === 'APPROVE'
                  ? 'bg-success-green/10 text-success-green'
                  : request.aiDecision === 'REJECT'
                    ? 'bg-error-red/10 text-error-red'
                    : 'bg-warning-amber/10 text-warning-amber'
              )}
            >
              {request.aiDecision}
            </span>
          </div>
        </div>

        {inference && (
          <div className="p-4 bg-surface-container-high rounded-xl border border-ai-accent/20">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-label-caps font-label-caps text-ai-accent uppercase block mb-1">
                  Live AI Inference
                </span>
                <h3 className="text-card-title font-card-title text-on-surface">{inference.headline}</h3>
              </div>
              <span
                className={clsx(
                  'px-2 py-1 rounded-full border text-label-caps font-label-caps w-fit',
                  riskClasses[inference.riskLevel]
                )}
              >
                {inference.riskLevel} RISK
              </span>
            </div>

            <p className="text-body-sm font-body-sm text-on-surface-variant mb-3">{inference.summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {inference.evidence.map((item) => (
                <div key={item} className="flex items-start gap-2 text-body-sm font-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[15px] text-ai-accent mt-0.5">check_circle</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-surface-container rounded-lg p-3">
              <p className="text-label-caps font-label-caps text-on-surface-variant uppercase mb-1">Next Action</p>
              <p className="text-body-sm font-body-sm text-on-surface">{inference.nextAction}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={loadInference} loading={isInferenceLoading}>
            <span className="material-symbols-outlined text-[18px]">psychology</span>
            Get AI Inference
          </Button>
          <Button variant="primary" onClick={openCopilot}>
            <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            More Info in Copilot
          </Button>
        </div>
      </div>
    </Modal>
  );
}

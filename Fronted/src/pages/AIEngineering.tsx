import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { clsx } from 'clsx';
import type { AIModel, EngineeringRequest } from '@/types';
import { deployAIModel, listAIModels, listEngineeringRequests } from '@/api/aiEngineering';

const STAGES = ['PLAN', 'CODE', 'TEST', 'VERIFY', 'DEPLOY'] as const;

export default function AIEngineeringPage() {
  const { success, error } = useToast();
  const [models, setModels] = useState<AIModel[]>([]);
  const [requests, setRequests] = useState<EngineeringRequest[]>([]);

  // Modals
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [cliModalOpen, setCliModalOpen] = useState(false);
  const [telemetryModalReq, setTelemetryModalReq] = useState<EngineeringRequest | null>(null);

  // Deploy Form state
  const [modelName, setModelName] = useState('');
  const [modelVersion, setModelVersion] = useState('1.0.0');
  const [modelType, setModelType] = useState<'LLM' | 'CLASSIFIER' | 'PREDICTOR' | 'OPTIMIZER'>('PREDICTOR');

  useEffect(() => {
    Promise.all([listAIModels(), listEngineeringRequests()])
      .then(([modelRows, requestRows]) => {
        setModels(modelRows);
        setRequests(requestRows);
      })
      .catch(() => undefined);
  }, []);

  const handleDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName) return;

    try {
      const deployed = await deployAIModel({
        name: modelName,
        version: modelVersion,
        type: modelType,
      });

      setModels((prev) => [deployed, ...prev]);
      setDeployModalOpen(false);
      setModelName('');
      success('Model Deployed', `${modelName} v${modelVersion} is now serving predictions.`);
    } catch {
      error('Model Not Deployed', 'The backend rejected the model deployment.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="AI Engineering"
        subtitle="Manage machine learning models, training pipelines, and algorithmic deployments"
      >
        <Button
          variant="secondary"
          onClick={() => setCliModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-[18px]">terminal</span>}
        >
          CLI Config
        </Button>
        <Button
          variant="primary"
          onClick={() => setDeployModalOpen(true)}
          leftIcon={<span className="material-symbols-outlined text-[18px]">rocket_launch</span>}
        >
          Deploy Model
        </Button>
      </PageHeader>

      {/* Model Inventory */}
      <div>
        <h2 className="text-section-title font-section-title text-on-surface mb-4">Deployed Intelligence Models</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {models.map((model) => (
            <GlassCard key={model.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-label-caps font-label-caps bg-surface-container-high text-on-surface-variant font-mono-data">
                    v{model.version}
                  </span>
                  <StatusChip
                    status={model.status === 'ACTIVE' ? 'success' : 'warning'}
                    label={model.status}
                  />
                </div>
                <h3 className="text-card-title font-card-title text-on-surface mb-1">{model.name}</h3>
                <p className="text-body-sm font-body-sm text-on-surface-variant mb-4">{model.description}</p>
              </div>

              <div className="space-y-3 pt-3 border-t border-outline-variant/10 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Accuracy</span>
                  <span className="font-mono-data text-mono-data text-success-green font-bold">
                    {model.accuracy == null ? 'Pending' : `${model.accuracy}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Latency</span>
                  <span className="font-mono-data text-mono-data text-primary">
                    {model.latencyMs == null ? 'Pending' : `${model.latencyMs}ms`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Throughput</span>
                  <span className="font-mono-data text-mono-data text-on-surface">
                    {model.requestsPerDay?.toLocaleString()}/day
                  </span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Active Pipeline Requests */}
      <div>
        <h2 className="text-section-title font-section-title text-on-surface mb-4">
          Active CI/CD Engineering Pipelines
        </h2>
        <div className="space-y-4">
          {requests.map((req) => (
            <GlassCard key={req.id}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-label-caps font-label-caps text-ai-accent bg-ai-accent/10 px-2 py-0.5 rounded border border-ai-accent/20">
                      PIPELINE
                    </span>
                    <h3 className="text-card-title font-card-title text-on-surface">{req.title}</h3>
                  </div>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">{req.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-mono-data font-mono-data text-primary font-bold">{req.progress}%</span>
                  <Button variant="ghost" size="sm" onClick={() => setTelemetryModalReq(req)}>
                    Inspect Telemetry
                  </Button>
                </div>
              </div>

              {/* Stage Stepper */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {STAGES.map((stage, idx) => {
                  const currentIdx = STAGES.indexOf(req.currentStage);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div key={stage} className="flex items-center flex-1 min-w-[100px]">
                      <div
                        className={clsx(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-body-sm font-body-sm w-full transition-all',
                          isDone
                            ? 'bg-success-green/10 text-success-green border border-success-green/20'
                            : isCurrent
                            ? 'bg-primary/10 text-primary border border-primary/30 ring-1 ring-primary/40'
                            : 'bg-surface-container text-on-surface-variant/50 border border-outline-variant/10'
                        )}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isDone ? 'check' : isCurrent ? 'hourglass_top' : 'radio_button_unchecked'}
                        </span>
                        <span className="text-label-caps font-label-caps">{stage}</span>
                      </div>
                      {idx < STAGES.length - 1 && (
                        <span className="material-symbols-outlined text-[14px] text-outline-variant mx-1">
                          arrow_forward
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Telemetry Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-container rounded-lg p-3">
                {req.telemetry.map((t) => (
                  <div key={t.label}>
                    <p className="text-metadata font-metadata text-on-surface-variant uppercase">{t.label}</p>
                    <p className="text-body-md font-body-md font-mono-data text-on-surface font-semibold">
                      {t.value} {t.unit}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Deploy Model Modal */}
      <Modal
        isOpen={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        title="Deploy Machine Learning Model"
        subtitle="Register containerized weights to the NEXUS cluster"
        icon="rocket_launch"
      >
        <form onSubmit={handleDeploySubmit} className="space-y-4">
          <Input
            label="Model Identifier"
            placeholder="e.g. Supply Chain Route Optimizer"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Semantic Version"
              placeholder="1.0.0"
              value={modelVersion}
              onChange={(e) => setModelVersion(e.target.value)}
              required
            />
            <div>
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase block mb-1">
                Architecture Type
              </label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value as any)}
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg p-2.5 text-body-sm text-on-surface outline-none"
              >
                <option value="PREDICTOR">Time-Series Predictor</option>
                <option value="CLASSIFIER">Anomaly Classifier</option>
                <option value="LLM">Core LLM Reasoner</option>
                <option value="OPTIMIZER">Linear Solver / Optimizer</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/10">
            <Button variant="secondary" type="button" onClick={() => setDeployModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Deploy to Cluster
            </Button>
          </div>
        </form>
      </Modal>

      {/* CLI Config Modal */}
      <Modal
        isOpen={cliModalOpen}
        onClose={() => setCliModalOpen(false)}
        title="NEXUS AI CLI Configuration"
        subtitle="Command line interface for model weight synchronization"
        icon="terminal"
      >
        <div className="space-y-4">
          <p className="text-body-sm text-on-surface-variant">
            Use the backend API and database seed commands below for local AI engineering checks.
          </p>
          <div className="p-4 bg-surface-container-lowest rounded-xl font-mono-data text-mono-data text-primary text-[13px] border border-outline-variant/20 overflow-x-auto">
            <code>.\.venv\Scripts\python.exe -m pytest -q</code>
          </div>
          <div className="p-4 bg-surface-container-lowest rounded-xl font-mono-data text-mono-data text-primary text-[13px] border border-outline-variant/20 overflow-x-auto">
            <code>.\.venv\Scripts\python.exe -m app.database.seed</code>
          </div>
          <div className="p-4 bg-surface-container rounded-xl text-body-sm space-y-1">
            <p className="font-bold text-on-surface">Supported Frameworks</p>
            <p className="text-on-surface-variant">PyTorch 2.4, ONNX Runtime, TensorRT-LLM, vLLM</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setCliModalOpen(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inspect Telemetry Modal */}
      {telemetryModalReq && (
        <Modal
          isOpen={true}
          onClose={() => setTelemetryModalReq(null)}
          title={`Pipeline Telemetry: ${telemetryModalReq.title}`}
          subtitle={`Current Stage: ${telemetryModalReq.currentStage} · Progress: ${telemetryModalReq.progress}%`}
          icon="analytics"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {telemetryModalReq.telemetry.map((t) => (
                <div key={t.label} className="p-3 bg-surface-container rounded-xl">
                  <p className="text-metadata font-metadata text-on-surface-variant uppercase">{t.label}</p>
                  <p className="text-section-title font-section-title text-primary font-mono-data">
                    {t.value} {t.unit}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={() => setTelemetryModalReq(null)}>
                Close Telemetry
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

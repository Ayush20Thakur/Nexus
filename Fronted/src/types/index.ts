// ============================================================
// NEXUS — Core TypeScript Types
// ============================================================

// === Auth & User ===
export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  department: string;
  permissions: string[];
  lastLoginAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// === System Health ===
export type HealthStatus = 'READY' | 'DEGRADED' | 'OFFLINE' | 'RECONNECTING';

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  lastChecked: string;
}

export interface SystemHealthState {
  overall: HealthStatus;
  uptime: number; // percentage
  services: ServiceHealth[];
  lastUpdated: string;
}

// === Notifications ===
export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'approval' | 'system' | 'fulfillment' | 'ai';
  timestamp: string;
  read: boolean;
  link?: string;
  priority?: RequestPriority;
}

// === Inventory ===
export type InventoryStatus = 'OPTIMAL' | 'LOW' | 'CRITICAL' | 'OVERSTOCK' | 'INACTIVE';
export type InventoryZone = 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D' | 'Zone E';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  zone: InventoryZone;
  quantityOnHand: number;
  quantityReserved: number;
  reorderThreshold: number;
  maxCapacity: number;
  unit: string;
  status: InventoryStatus;
  lastUpdated: string;
  supplier?: string;
  unitCost?: number;
}

// === Requests ===
export type RequestType = 'TRANSFER' | 'PURCHASE' | 'MAINTENANCE' | 'EMERGENCY' | 'STANDARD';
export type RequestPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AIDecision = 'APPROVE' | 'REVIEW' | 'REJECT' | 'ESCALATE';

export interface OperationalRequest {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  type: RequestType;
  priority: RequestPriority;
  status: RequestStatus;
  requester: string;
  requesterDept: string;
  assignee?: string;
  inventoryItem?: string;
  quantity?: number;
  aiDecision: AIDecision;
  aiConfidence: number;
  aiReasoning: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  rejectionReason?: string;
  clarifyMessage?: string;
}

// === Approvals ===
export interface Approval {
  id: string;
  requestId: string;
  requestNumber: string;
  title: string;
  priority: RequestPriority;
  requester: string;
  requesterDept: string;
  quantity: number;
  unit: string;
  aiRecommendation: string;
  availableStock: number;
  procureQuantity: number;
  safetyStock: number;
  waitingTime: string;
  aiConfidence: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLARIFYING';
  createdAt: string;
  decisionNote?: string;
}

// === Fulfillment ===
export type FulfillmentStatus = 'QUEUED' | 'PROCESSING' | 'ALLOCATED' | 'SHIPPED' | 'DELIVERED' | 'FAILED';

export interface FulfillmentOrder {
  id: string;
  requestNumber: string;
  requestId?: string;
  title: string;
  requestedBy: string;
  approvedBy: string;
  approvedQuantity: number;
  availableStock: number;
  safetyStockMin: number;
  safetyStockMax: number;
  unit: string;
  status: FulfillmentStatus;
  priority: RequestPriority;
  carrier?: string;
  trackingNumber?: string;
  eta?: string;
  approvedAt: string;
  fulfilledAt?: string;
}

// === Dashboard ===
export interface DashboardKPI {
  availableInventory: number;
  inventoryTrend: number;
  pendingRequests: number;
  requestsTrend: number;
  criticalRequests: number;
  lowStockItems: number;
  operationalHealth: number;
}

export interface OperationalHealthMetric {
  label: string;
  value: number;
  segments: HealthSegment[];
}

export interface HealthSegment {
  color: 'success' | 'warning' | 'error' | 'neutral';
  percentage: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'request' | 'approval' | 'fulfillment' | 'alert' | 'system' | 'ai';
  title: string;
  description: string;
  timestamp: string;
  priority?: RequestPriority;
  actor?: string;
  link?: string;
}

// === Insights ===
export interface RequestVolumePoint {
  date: string;
  requests: number;
  approved: number;
  rejected: number;
}

export interface InsightKPI {
  label: string;
  value: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'stable';
  unit?: string;
  status: 'good' | 'warning' | 'critical';
}

export interface InventoryDistributionItem {
  category: string;
  value: number;
  percentage: number;
}

// === Copilot ===
export type MessageRole = 'user' | 'assistant' | 'system';

export interface CopilotMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface CopilotConversation {
  id: string;
  title: string;
  messages: CopilotMessage[];
  createdAt: string;
  updatedAt: string;
}

// === Decision Engine ===
export type RuleStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
export type RuleCategory = 'INVENTORY' | 'REQUEST' | 'FULFILLMENT' | 'ALERT' | 'ESCALATION';

export interface DecisionRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  status: RuleStatus;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  triggerCount: number;
  lastTriggered?: string;
  createdBy: string;
  createdAt: string;
}

export interface RuleCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in';
  value: string | number | boolean;
}

export interface RuleAction {
  type: 'APPROVE' | 'REJECT' | 'ESCALATE' | 'NOTIFY' | 'CREATE_ORDER' | 'UPDATE_STATUS';
  params: Record<string, string | number | boolean>;
}

export interface SimulationResult {
  decision: AIDecision;
  confidence: number;
  reasoning: string;
  appliedRules: string[];
  factors: SimulationFactor[];
  recommendation: string;
}

export interface SimulationFactor {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

// === AI Engineering ===
export type ModelStatus = 'ACTIVE' | 'STAGING' | 'TRAINING' | 'DEPRECATED' | 'ERROR';
export type PipelineStage = 'PLAN' | 'CODE' | 'TEST' | 'VERIFY' | 'DEPLOY';

export interface AIModel {
  id: string;
  name: string;
  version: string;
  type: 'LLM' | 'CLASSIFIER' | 'PREDICTOR' | 'OPTIMIZER';
  status: ModelStatus;
  accuracy?: number;
  latencyMs?: number;
  requestsPerDay?: number;
  deployedAt: string;
  description: string;
}

export interface EngineeringRequest {
  id: string;
  title: string;
  description: string;
  currentStage: PipelineStage;
  progress: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'QUEUED';
  createdAt: string;
  estimatedCompletion?: string;
  telemetry: TelemetryMetric[];
}

export interface TelemetryMetric {
  label: string;
  value: string;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
}

// === Policy Center ===
export type PolicyStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'UNDER_REVIEW';

export interface Policy {
  id: string;
  title: string;
  description: string;
  version: string;
  status: PolicyStatus;
  category: string;
  rules: PolicyRule[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  effectiveDate?: string;
  expiryDate?: string;
}

export interface PolicyRule {
  id: string;
  description: string;
  isActive: boolean;
  scope: string;
}

// === Audit Log ===
export type AuditEventType =
  | 'AUTH'
  | 'REQUEST'
  | 'APPROVAL'
  | 'INVENTORY'
  | 'FULFILLMENT'
  | 'POLICY'
  | 'SYSTEM'
  | 'AI'
  | 'USER'
  | 'REPORT';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  action: string;
  actor: string;
  actorRole: UserRole;
  resourceType: string;
  resourceId: string;
  description: string;
  metadata?: Record<string, string | number | boolean>;
  ipAddress?: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

// === Reports ===
export type ReportCategory = 'INVENTORY' | 'REQUESTS' | 'FULFILLMENT' | 'COMPLIANCE' | 'AI' | 'EXECUTIVE';
export type ReportStatus = 'QUEUED' | 'GENERATING' | 'GENERATED' | 'FAILED';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  status: ReportStatus;
  format: 'PDF' | 'CSV' | 'XLSX';
  generatedBy: string;
  generatedAt?: string;
  fileSize?: string;
  pages?: number;
  scheduledFor?: string;
  dateRange: {
    from: string;
    to: string;
  };
}

// === UI Filter & Pagination ===
export interface FilterState {
  search: string;
  status?: string;
  priority?: string;
  category?: string;
  zone?: string;
  dateFrom?: string;
  dateTo?: string;
}

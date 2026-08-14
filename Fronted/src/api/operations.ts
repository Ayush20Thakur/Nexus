import { apiClient } from './client';
import type { DashboardSummary, InsightsSummary } from './analytics';
import type {
  Approval,
  AuditEvent,
  DecisionRule,
  FulfillmentOrder,
  InventoryItem,
  Policy,
  PolicyRule,
  Report,
  OperationalRequest,
  ActivityFeedItem,
  RequestPriority,
  RequestType,
} from '@/types';

export interface OperationsBootstrap {
  inventory: InventoryItem[];
  requests: OperationalRequest[];
  approvals: Approval[];
  fulfillment: FulfillmentOrder[];
  auditEvents: AuditEvent[];
  activityFeed: ActivityFeedItem[];
  policies: Policy[];
  decisionRules: DecisionRule[];
  reports: Report[];
  dashboard?: DashboardSummary;
  insights?: InsightsSummary;
}

export interface CreateRequestPayload {
  title: string;
  description: string;
  type: RequestType;
  priority: RequestPriority;
  requester: string;
  requesterDept: string;
  inventoryItemId?: string;
  quantity?: number;
}

export interface CreateRequestResponse {
  request: OperationalRequest;
  approval: Approval;
}

export interface ApprovalActionResponse {
  approval: Approval;
  request: OperationalRequest;
  fulfillment?: FulfillmentOrder;
}

export interface FulfillmentAdvanceResponse {
  fulfillment: FulfillmentOrder;
  inventory?: InventoryItem | null;
  request?: OperationalRequest | null;
}

export interface DecisionSimulationPayload {
  type: RequestType;
  priority: RequestPriority;
  quantity: number;
}

export interface DecisionSimulationResponse {
  decision: string;
  confidence: number;
  reasoning: string;
  rulesTriggered: string[];
  evaluatedAt: string;
}

export interface DecisionMetrics {
  totalRules: number;
  activeRules: number;
  ruleTriggers: number;
  averageConfidence: number;
  automationRate: number;
  manualReviewQueue: number;
  ruleCoverage: number;
}

export type CreatePolicyPayload = Omit<Policy, 'id' | 'createdAt' | 'updatedAt' | 'rules'> & {
  rules: Array<Omit<PolicyRule, 'id'>>;
};

export const operationsApi = {
  async bootstrap(): Promise<OperationsBootstrap> {
    const { data } = await apiClient.get<OperationsBootstrap>('/bootstrap');
    return data;
  },

  async createInventoryItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    const { data } = await apiClient.post<InventoryItem>('/inventory', item);
    return data;
  },

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const { data } = await apiClient.patch<InventoryItem>(`/inventory/${id}`, updates);
    return data;
  },

  async adjustStock(id: string, delta: number): Promise<InventoryItem> {
    const { data } = await apiClient.patch<InventoryItem>(`/inventory/${id}/stock`, { delta });
    return data;
  },

  async createRequest(payload: CreateRequestPayload): Promise<CreateRequestResponse> {
    const { data } = await apiClient.post<CreateRequestResponse>('/requests', payload);
    return data;
  },

  async approveApproval(id: string, note?: string): Promise<ApprovalActionResponse> {
    const { data } = await apiClient.post<ApprovalActionResponse>(`/approvals/${id}/approve`, { note });
    return data;
  },

  async rejectApproval(id: string, reason: string): Promise<ApprovalActionResponse> {
    const { data } = await apiClient.post<ApprovalActionResponse>(`/approvals/${id}/reject`, { reason });
    return data;
  },

  async clarifyApproval(id: string, message: string): Promise<ApprovalActionResponse> {
    const { data } = await apiClient.post<ApprovalActionResponse>(`/approvals/${id}/clarify`, { message });
    return data;
  },

  async advanceFulfillment(id: string): Promise<FulfillmentAdvanceResponse> {
    const { data } = await apiClient.post<FulfillmentAdvanceResponse>(`/fulfillment/${id}/advance`);
    return data;
  },

  async createFulfillmentOrder(order: Omit<FulfillmentOrder, 'id' | 'approvedAt'>): Promise<FulfillmentOrder> {
    const { data } = await apiClient.post<FulfillmentOrder>('/fulfillment', order);
    return data;
  },

  async createPolicy(policy: CreatePolicyPayload): Promise<Policy> {
    const { data } = await apiClient.post<Policy>('/policies', policy);
    return data;
  },

  async updatePolicy(id: string, updates: Partial<Policy>): Promise<Policy> {
    const { data } = await apiClient.patch<Policy>(`/policies/${id}`, updates);
    return data;
  },

  async togglePolicy(id: string): Promise<Policy> {
    const { data } = await apiClient.post<Policy>(`/policies/${id}/toggle`);
    return data;
  },

  async createDecisionRule(rule: Omit<DecisionRule, 'id' | 'createdAt' | 'triggerCount'>): Promise<DecisionRule> {
    const { data } = await apiClient.post<DecisionRule>('/decision-engine/rules', rule);
    return data;
  },

  async toggleDecisionRule(id: string): Promise<DecisionRule> {
    const { data } = await apiClient.post<DecisionRule>(`/decision-engine/rules/${id}/toggle`);
    return data;
  },

  async getDecisionMetrics(): Promise<DecisionMetrics> {
    const { data } = await apiClient.get<DecisionMetrics>('/decision-engine/metrics');
    return data;
  },

  async simulateDecision(payload: DecisionSimulationPayload): Promise<DecisionSimulationResponse> {
    const { data } = await apiClient.post<DecisionSimulationResponse>('/decision-engine/simulate', payload);
    return data;
  },

  async generateReport(title: string, category: Report['category'], format: Report['format'], range: { from: string; to: string }): Promise<Report> {
    const { data } = await apiClient.post<Report>('/reports', {
      title,
      category,
      format,
      dateRange: range,
    });
    return data;
  },

  async downloadReport(id: string): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(`/reports/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },
};

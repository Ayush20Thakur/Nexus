import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  InventoryItem,
  OperationalRequest,
  Approval,
  FulfillmentOrder,
  AuditEvent,
  ActivityFeedItem,
  Policy,
  DecisionRule,
  Report,
  DashboardKPI,
  RequestPriority,
  RequestType,
} from '@/types';
import { operationsApi, type CreatePolicyPayload } from '@/api/operations';
import type { DashboardSummary, InsightsSummary } from '@/api/analytics';

const BOOTSTRAP_CACHE_MS = 60_000;
let bootstrapRequest: ReturnType<typeof operationsApi.bootstrap> | null = null;

async function loadBootstrapOnce() {
  if (!bootstrapRequest) {
    bootstrapRequest = operationsApi.bootstrap().finally(() => {
      bootstrapRequest = null;
    });
  }
  return bootstrapRequest;
}

interface OperationsStore {
  inventory: InventoryItem[];
  requests: OperationalRequest[];
  approvals: Approval[];
  fulfillment: FulfillmentOrder[];
  auditEvents: AuditEvent[];
  activityFeed: ActivityFeedItem[];
  policies: Policy[];
  decisionRules: DecisionRule[];
  reports: Report[];
  dashboardSummary: DashboardSummary | null;
  insightsSummary: InsightsSummary | null;
  isLoading: boolean;
  lastError: string | null;
  hasLoaded: boolean;
  lastLoadedAt: number | null;

  loadAll: (force?: boolean) => Promise<void>;

  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<InventoryItem>;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<InventoryItem>;
  adjustStock: (id: string, delta: number) => Promise<InventoryItem>;

  createRequest: (data: {
    title: string;
    description: string;
    type: RequestType;
    priority: RequestPriority;
    requester: string;
    requesterDept: string;
    inventoryItemId?: string;
    quantity?: number;
  }) => Promise<OperationalRequest>;

  approveApproval: (approvalId: string, note?: string) => Promise<void>;
  rejectApproval: (approvalId: string, reason: string) => Promise<void>;
  clarifyApproval: (approvalId: string, message: string) => Promise<void>;

  advanceFulfillmentStatus: (orderId: string) => Promise<void>;
  createFulfillmentOrder: (order: Omit<FulfillmentOrder, 'id' | 'approvedAt'>) => Promise<void>;

  createPolicy: (policy: CreatePolicyPayload) => Promise<Policy>;
  updatePolicy: (id: string, updates: Partial<Policy>) => Promise<Policy>;
  togglePolicyStatus: (id: string) => Promise<void>;

  createDecisionRule: (rule: Omit<DecisionRule, 'id' | 'createdAt' | 'triggerCount'>) => Promise<DecisionRule>;
  toggleDecisionRule: (id: string) => Promise<void>;

  generateReport: (title: string, category: Report['category'], format: Report['format'], range: { from: string; to: string }) => Promise<Report>;

  getKPIs: () => DashboardKPI;
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [item, ...items];
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Backend request failed.';
}

export const useOperationsStore = create<OperationsStore>()(
  persist(
    (set, get) => ({
      inventory: [],
      requests: [],
      approvals: [],
      fulfillment: [],
      auditEvents: [],
      activityFeed: [],
      policies: [],
      decisionRules: [],
      reports: [],
      dashboardSummary: null,
      insightsSummary: null,
      isLoading: false,
      lastError: null,
      hasLoaded: false,
      lastLoadedAt: null,

      loadAll: async (force = false) => {
        const state = get();
        if (
          !force &&
          state.hasLoaded &&
          state.lastLoadedAt !== null &&
          Date.now() - state.lastLoadedAt < BOOTSTRAP_CACHE_MS
        ) {
          return;
        }

        set({ isLoading: true, lastError: null });
        try {
          const data = await loadBootstrapOnce();
          set({
            inventory: data.inventory,
            requests: data.requests,
            approvals: data.approvals,
            fulfillment: data.fulfillment,
            auditEvents: data.auditEvents,
            activityFeed: data.activityFeed,
            policies: data.policies,
            decisionRules: data.decisionRules,
            reports: data.reports,
            dashboardSummary: data.dashboard ?? null,
            insightsSummary: data.insights ?? null,
            isLoading: false,
            hasLoaded: true,
            lastLoadedAt: Date.now(),
          });
        } catch (error) {
          set({ isLoading: false, lastError: errorMessage(error) });
          throw error;
        }
      },

      addInventoryItem: async (itemData) => {
        const item = await operationsApi.createInventoryItem(itemData);
        set((state) => ({ inventory: upsertById(state.inventory, item) }));
        return item;
      },

      updateInventoryItem: async (id, updates) => {
        const item = await operationsApi.updateInventoryItem(id, updates);
        set((state) => ({ inventory: upsertById(state.inventory, item) }));
        return item;
      },

      adjustStock: async (id, delta) => {
        const item = await operationsApi.adjustStock(id, delta);
        set((state) => ({ inventory: upsertById(state.inventory, item) }));
        return item;
      },

      createRequest: async (data) => {
        const result = await operationsApi.createRequest(data);
        set((state) => ({
          requests: upsertById(state.requests, result.request),
          approvals: upsertById(state.approvals, result.approval),
        }));
        return result.request;
      },

      approveApproval: async (approvalId, note) => {
        const result = await operationsApi.approveApproval(approvalId, note);
        set((state) => ({
          approvals: upsertById(state.approvals, result.approval),
          requests: upsertById(state.requests, result.request),
          fulfillment: result.fulfillment ? upsertById(state.fulfillment, result.fulfillment) : state.fulfillment,
        }));
      },

      rejectApproval: async (approvalId, reason) => {
        const result = await operationsApi.rejectApproval(approvalId, reason);
        set((state) => ({
          approvals: upsertById(state.approvals, result.approval),
          requests: upsertById(state.requests, result.request),
        }));
      },

      clarifyApproval: async (approvalId, message) => {
        const result = await operationsApi.clarifyApproval(approvalId, message);
        set((state) => ({
          approvals: upsertById(state.approvals, result.approval),
          requests: upsertById(state.requests, result.request),
        }));
      },

      advanceFulfillmentStatus: async (orderId) => {
        const result = await operationsApi.advanceFulfillment(orderId);
        set((state) => ({
          fulfillment: upsertById(state.fulfillment, result.fulfillment),
          inventory: result.inventory ? upsertById(state.inventory, result.inventory) : state.inventory,
          requests: result.request ? upsertById(state.requests, result.request) : state.requests,
        }));
      },

      createFulfillmentOrder: async (orderData) => {
        const order = await operationsApi.createFulfillmentOrder(orderData);
        set((state) => ({ fulfillment: upsertById(state.fulfillment, order) }));
      },

      createPolicy: async (policyData) => {
        const policy = await operationsApi.createPolicy(policyData);
        set((state) => ({ policies: upsertById(state.policies, policy) }));
        return policy;
      },

      updatePolicy: async (id, updates) => {
        const policy = await operationsApi.updatePolicy(id, updates);
        set((state) => ({ policies: upsertById(state.policies, policy) }));
        return policy;
      },

      togglePolicyStatus: async (id) => {
        const policy = await operationsApi.togglePolicy(id);
        set((state) => ({ policies: upsertById(state.policies, policy) }));
      },

      createDecisionRule: async (ruleData) => {
        const rule = await operationsApi.createDecisionRule(ruleData);
        set((state) => ({ decisionRules: upsertById(state.decisionRules, rule) }));
        return rule;
      },

      toggleDecisionRule: async (id) => {
        const rule = await operationsApi.toggleDecisionRule(id);
        set((state) => ({ decisionRules: upsertById(state.decisionRules, rule) }));
      },

      generateReport: async (title, category, format, range) => {
        const report = await operationsApi.generateReport(title, category, format, range);
        set((state) => ({ reports: upsertById(state.reports, report) }));
        return report;
      },

      getKPIs: () => {
        const state = get();
        const totalOnHand = state.inventory.reduce((acc, curr) => acc + curr.quantityOnHand, 0);
        const pendingReqs = state.requests.filter((r) => r.status === 'PENDING').length;
        const critReqs = state.requests.filter((r) => r.priority === 'CRITICAL' && r.status === 'PENDING').length;
        const lowStock = state.inventory.filter((i) => i.status === 'LOW' || i.status === 'CRITICAL').length;
        const delivered = state.fulfillment.filter((order) => order.status === 'DELIVERED').length;
        const totalReserved = state.inventory.reduce((acc, curr) => acc + curr.quantityReserved, 0);
        const operationalHealth = state.fulfillment.length ? Math.round((delivered / state.fulfillment.length) * 100) : 0;

        return {
          availableInventory: totalOnHand,
          inventoryTrend: totalOnHand ? Math.round((totalReserved / totalOnHand) * 100) : 0,
          pendingRequests: pendingReqs,
          requestsTrend: state.requests.length ? Math.round((pendingReqs / state.requests.length) * 100) : 0,
          criticalRequests: critReqs,
          lowStockItems: lowStock,
          operationalHealth,
        };
      },
    }),
    {
      name: 'nexus-operations-store',
      partialize: (state) => ({
        inventory: state.inventory,
        requests: state.requests,
        approvals: state.approvals,
        fulfillment: state.fulfillment,
        auditEvents: state.auditEvents,
        activityFeed: state.activityFeed,
        policies: state.policies,
        decisionRules: state.decisionRules,
        reports: state.reports,
        dashboardSummary: state.dashboardSummary,
        insightsSummary: state.insightsSummary,
      }),
    }
  )
);

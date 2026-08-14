import type { CopilotMessage } from '@/types';
import { apiClient } from './client';

export interface CopilotConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CopilotContext {
  availableInventory: number;
  pendingRequests: number;
  criticalRequests: number;
  pendingApprovals: number;
  lowStockItems: number;
  fulfillmentOrders: number;
  deliveredOrders: number;
  reportsGenerated: number;
  activeModel: string;
  activeModelVersion?: string | null;
}

export interface CopilotState {
  conversation: CopilotConversationSummary;
  messages: CopilotMessage[];
  context: CopilotContext;
  suggestions: string[];
}

export interface CopilotChatResponse {
  conversation: CopilotConversationSummary;
  messages: CopilotMessage[];
  message: CopilotMessage;
  context: CopilotContext;
  suggestions: string[];
}

export type CopilotEntityType = 'request' | 'approval' | 'fulfillment' | 'inventory';

export interface CopilotEntityInference {
  entityType: CopilotEntityType;
  entityId: string;
  title: string;
  headline: string;
  decision: string;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  evidence: string[];
  nextAction: string;
  generatedAt: string;
  chatPrompt: string;
}

export async function getCopilotState(): Promise<CopilotState> {
  const { data } = await apiClient.get<CopilotState>('/copilot/state');
  return data;
}

export async function startCopilotConversation(): Promise<CopilotState> {
  const { data } = await apiClient.post<CopilotState>('/copilot/conversations');
  return data;
}

export async function askCopilot(query: string, conversationId?: string): Promise<CopilotChatResponse> {
  const { data } = await apiClient.post<CopilotChatResponse>('/copilot/chat', {
    message: query,
    conversationId,
  });
  return data;
}

export async function getEntityInference(
  entityType: CopilotEntityType,
  entityId: string
): Promise<CopilotEntityInference> {
  const { data } = await apiClient.post<CopilotEntityInference>('/copilot/inference', {
    entityType,
    entityId,
  });
  return data;
}

import { apiClient } from './client';
import type {
  ActivityFeedItem,
  DashboardKPI,
  InsightKPI,
  InventoryDistributionItem,
  OperationalHealthMetric,
  RequestVolumePoint,
} from '@/types';

export interface InventoryZonePoint {
  label: string;
  units: number;
}

export interface DashboardSummary {
  kpis: DashboardKPI;
  activityFeed: ActivityFeedItem[];
  requestVolume: RequestVolumePoint[];
  inventoryTrend: InventoryZonePoint[];
  healthMetrics: OperationalHealthMetric[];
  overallSla: number;
  executiveBrief: {
    readinessScore: number;
    status: 'READY' | 'WATCH' | 'AT_RISK' | 'BLOCKED';
    headline: string;
    riskNarrative: string;
    nextActions: string[];
    queuePressure: number;
    reorderExposure: number;
    automationRate: number;
    avgAiConfidence: number;
  };
}

export interface InsightsSummary {
  kpis: InsightKPI[];
  requestVolume: RequestVolumePoint[];
  inventoryDistribution: InventoryDistributionItem[];
}

export async function getInsightsSummary(): Promise<InsightsSummary> {
  const { data } = await apiClient.get<InsightsSummary>('/insights/summary');
  return data;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary');
  return data;
}

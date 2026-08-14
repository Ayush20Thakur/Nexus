import { apiClient } from './client';
import type { AIModel, EngineeringRequest } from '@/types';

export async function listAIModels(): Promise<AIModel[]> {
  const { data } = await apiClient.get<AIModel[]>('/ai-engineering/models');
  return data;
}

export async function deployAIModel(payload: Pick<AIModel, 'name' | 'version' | 'type'>): Promise<AIModel> {
  const { data } = await apiClient.post<AIModel>('/ai-engineering/models', payload);
  return data;
}

export async function listEngineeringRequests(): Promise<EngineeringRequest[]> {
  const { data } = await apiClient.get<EngineeringRequest[]>('/ai-engineering/requests');
  return data;
}

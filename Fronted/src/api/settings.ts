import { apiClient } from './client';
import type { User } from '@/types';

export interface UserPreferences {
  emailAlerts: boolean;
  critAlerts: boolean;
  aiInsights: boolean;
  twoFactor: boolean;
}

export async function updateBackendProfile(payload: Pick<User, 'displayName' | 'department'>): Promise<User> {
  const { data } = await apiClient.patch<User>('/settings/profile', payload);
  return data;
}

export async function getBackendPreferences(): Promise<UserPreferences> {
  const { data } = await apiClient.get<UserPreferences>('/settings/preferences');
  return data;
}

export async function updateBackendPreferences(payload: UserPreferences): Promise<UserPreferences> {
  const { data } = await apiClient.patch<UserPreferences>('/settings/preferences', payload);
  return data;
}

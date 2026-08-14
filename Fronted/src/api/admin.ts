import { apiClient } from './client';
import type { User, UserRole } from '@/types';

interface BackendUser {
  id: string;
  email: string;
  display_name: string;
  department: string;
  role: UserRole;
  permissions: string[];
  avatar_url?: string | null;
  last_login_at?: string | null;
}

interface BackendUserList {
  items: BackendUser[];
}

export interface CreateUserPayload {
  email: string;
  display_name: string;
  department: string;
  role: UserRole;
}

export interface SystemUnit {
  name: string;
  status: string;
  load: string;
}

function toFrontendUser(user: BackendUser): User {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    department: user.department,
    permissions: user.permissions,
    avatarUrl: user.avatar_url ?? undefined,
    lastLoginAt: user.last_login_at ?? undefined,
  };
}

export async function listUsers(): Promise<User[]> {
  const { data } = await apiClient.get<BackendUserList>('/users');
  return data.items.map(toFrontendUser);
}

export async function updateUserRole(userId: string, role: UserRole): Promise<User> {
  const { data } = await apiClient.patch<{ user: BackendUser }>(`/users/${userId}/role`, { role });
  return toFrontendUser(data.user);
}

export async function createUser(payload: CreateUserPayload): Promise<User> {
  const { data } = await apiClient.post<BackendUser>('/users', payload);
  return toFrontendUser(data);
}

export async function listSystemUnits(): Promise<SystemUnit[]> {
  const { data } = await apiClient.get<SystemUnit[]>('/users/system-units');
  return data;
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { apiClient } from '@/api/client';
import { supabase } from '@/api/supabase';

interface BackendUser {
  id: string;
  external_id?: string | null;
  supabase_auth_user_id?: string | null;
  email: string;
  display_name: string;
  department: string;
  role: User['role'];
  permissions: string[];
  avatar_url?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  fetchCurrentUser: () => Promise<User>;
  clearError: () => void;
}

let authSubscriptionStarted = false;

function toFrontendUser(user: BackendUser): User {
  return {
    id: user.external_id ?? user.id,
    email: user.email,
    displayName: user.display_name,
    department: user.department,
    role: user.role,
    avatarUrl: user.avatar_url ?? undefined,
    permissions: user.permissions,
    lastLoginAt: user.last_login_at ?? undefined,
  };
}

async function loadBackendUser(token: string): Promise<User> {
  const { data } = await apiClient.get<{ authenticated: boolean; user: BackendUser }>('/auth/session', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return toFrontendUser(data.user);
}

function authErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Authentication failed.';
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      initializeAuth: async () => {
        if (!authSubscriptionStarted) {
          authSubscriptionStarted = true;
          supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
              set({ user: null, token: null, isAuthenticated: false, isLoading: false });
              return;
            }
            if (session?.access_token) {
              set({ token: session.access_token });
            }
          });
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          const token = data.session?.access_token;
          if (!token) {
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
            return;
          }
          const user = await loadBackendUser(token);
          set({ user, token, isAuthenticated: true, isLoading: false, error: null });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: authErrorMessage(error),
          });
        }
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          const token = data.session?.access_token;
          if (!token) throw new Error('Supabase did not return a session token.');
          const user = await loadBackendUser(token);
          set({ user, token, isAuthenticated: true, isLoading: false, error: null });
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: authErrorMessage(error),
          });
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, token: null, isAuthenticated: false, error: null, isLoading: false });
      },

      updateProfile: (updates) => {
        set((s) => ({
          user: s.user ? { ...s.user, ...updates } : null,
        }));
      },

      fetchCurrentUser: async () => {
        const token = get().token;
        if (!token) throw new Error('No active Supabase session.');
        const user = await loadBackendUser(token);
        set({ user, isAuthenticated: true, error: null });
        return user;
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'nexus-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

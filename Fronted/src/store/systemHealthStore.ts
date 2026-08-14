import { create } from 'zustand';
import type { HealthStatus, SystemHealthState } from '@/types';
import { getCurrentISO } from '@/utils/date';
import { apiClient } from '@/api/client';

interface SystemHealthStore extends SystemHealthState {
  refreshHealth: () => Promise<void>;
}

export const useSystemHealthStore = create<SystemHealthStore>((set) => ({
  overall: 'RECONNECTING',
  uptime: 0,
  lastUpdated: getCurrentISO(),
  services: [],

  refreshHealth: async () => {
    const started = performance.now();
    const { data } = await apiClient.get<{
      status: 'ok' | 'degraded';
      database: { status: 'ok' | 'unconfigured' | 'error'; latency_ms?: number | null };
    }>('/health');
    const apiLatency = Math.max(1, Math.round(performance.now() - started));
    const databaseReady = data.database.status === 'ok';
    const checkedAt = getCurrentISO();

    set(() => ({
      overall: data.status === 'ok' && databaseReady ? 'READY' : 'DEGRADED',
      uptime: data.status === 'ok' && databaseReady ? 100 : 0,
      lastUpdated: checkedAt,
      services: [
        { name: 'Core API Gateway', status: data.status === 'ok' ? 'READY' : 'DEGRADED', latencyMs: apiLatency, lastChecked: checkedAt },
        {
          name: 'Distributed Database',
          status: databaseReady ? 'READY' : 'DEGRADED',
          latencyMs: Math.round(data.database.latency_ms ?? apiLatency),
          lastChecked: checkedAt,
        },
      ],
    }));
  },
}));

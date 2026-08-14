import { create } from 'zustand';
import type { SystemNotification } from '@/types';
import { getCurrentISO } from '@/utils/date';

interface NotificationsStore {
  notifications: SystemNotification[];
  unreadCount: () => number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (n: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  notifications: [],

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  markAsRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),

  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),

  addNotification: (n) =>
    set((s) => ({
      notifications: [
        {
          ...n,
          id: `notif-${Date.now()}`,
          timestamp: getCurrentISO(),
          read: false,
        },
        ...s.notifications,
      ],
    })),

  clearAll: () => set({ notifications: [] }),
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

export interface AppNotification {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  details?: string; // Stack trace, query details, etc.
  context?: {
    component?: string;
    action?: string;
    [key: string]: any;
  };
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;

  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  clearNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotification: AppNotification = {
          ...notification,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      clearNotification: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          const wasUnread = notification && !notification.read;

          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      },
    }),
    {
      name: 'pekao-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Persist only last 50
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Helper function to capture error details
export function captureErrorDetails(error: any): string {
  if (typeof error === 'string') return error;

  if (error?.message) {
    let details = error.message;
    if (error.code) details = `[${error.code}] ${details}`;
    if (error.hint) details += `\nHint: ${error.hint}`;
    if (error.details) details += `\nDetails: ${error.details}`;
    if (error.stack && import.meta.env.DEV) {
      details += `\n\nStack:\n${error.stack}`;
    }
    return details;
  }

  return JSON.stringify(error, null, 2);
}

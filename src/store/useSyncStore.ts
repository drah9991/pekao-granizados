import { create } from "zustand";
import { persist, StateStorage, createJSONStorage } from "zustand/middleware";
import { offlineService } from "@/lib/OfflineService";

export interface SyncOrder {
  id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface SyncFailure {
  code: string;
  message: string;
}

/** Venta cobrada que la base rechazó: se conserva para reintentar o revisar, nunca se borra. */
export interface FailedSyncOrder extends SyncOrder {
  error: SyncFailure;
  failedAt: string;
}

interface SyncStoreState {
  syncQueue: SyncOrder[];
  failedQueue: FailedSyncOrder[];
  addToQueue: (orderPayload: Record<string, unknown>) => SyncOrder;
  removeFromQueue: (id: string) => void;
  moveToFailed: (id: string, error: SyncFailure) => void;
  retryFailed: (id: string) => void;
  clearQueue: () => void;
}

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await offlineService.getSyncStoreVal(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await offlineService.setSyncStoreVal(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await offlineService.removeSyncStoreVal(name);
  },
};

export const useSyncStore = create<SyncStoreState>()(
  persist(
    (set, get) => ({
      syncQueue: [],
      failedQueue: [],
      addToQueue: (payload) => {
        const id = (payload.id as string) || crypto.randomUUID();
        const syncOrder: SyncOrder = {
          id,
          payload,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          syncQueue: [...state.syncQueue, syncOrder],
        }));
        return syncOrder;
      },
      removeFromQueue: (id) => set((state) => ({
        syncQueue: state.syncQueue.filter((item) => item.id !== id),
      })),
      moveToFailed: (id, error) => set((state) => {
        const order = state.syncQueue.find((item) => item.id === id);
        if (!order) return state;
        return {
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
          failedQueue: [...state.failedQueue, { ...order, error, failedAt: new Date().toISOString() }],
        };
      }),
      retryFailed: (id) => set((state) => {
        const failed = state.failedQueue.find((item) => item.id === id);
        if (!failed) return state;
        const { id: orderId, payload, timestamp } = failed;
        return {
          failedQueue: state.failedQueue.filter((item) => item.id !== id),
          syncQueue: [...state.syncQueue, { id: orderId, payload, timestamp }],
        };
      }),
      clearQueue: () => set({ syncQueue: [] }),
    }),
    {
      name: "oasis-eon-sync-queue",
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({ syncQueue: state.syncQueue, failedQueue: state.failedQueue }) as any,
    }
  )
);

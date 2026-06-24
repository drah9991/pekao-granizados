import { create } from "zustand";
import { persist, StateStorage } from "zustand/middleware";
import { offlineService } from "@/lib/OfflineService";

export interface SyncOrder {
  id: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

interface SyncStoreState {
  syncQueue: SyncOrder[];
  addToQueue: (orderPayload: Record<string, unknown>) => SyncOrder;
  removeFromQueue: (id: string) => void;
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
      clearQueue: () => set({ syncQueue: [] }),
    }),
    {
      name: "oasis-eon-sync-queue",
      storage: indexedDBStorage,
    }
  )
);

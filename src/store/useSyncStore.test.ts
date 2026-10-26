import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/OfflineService", () => ({
  offlineService: {
    getSyncStoreVal: vi.fn(async () => null),
    setSyncStoreVal: vi.fn(async () => undefined),
    removeSyncStoreVal: vi.fn(async () => undefined),
  },
}));

import { useSyncStore } from "./useSyncStore";

const SALE = { id: "sale-1", total: 8500, idempotency_key: "key-1" };

describe("useSyncStore failed queue", () => {
  beforeEach(() => {
    useSyncStore.setState({ syncQueue: [], failedQueue: [] });
  });

  it("moves a rejected sale to the failed queue instead of dropping it", () => {
    useSyncStore.getState().addToQueue(SALE);

    useSyncStore.getState().moveToFailed("sale-1", { code: "23503", message: "fk violation" });

    const { syncQueue, failedQueue } = useSyncStore.getState();
    expect(syncQueue).toHaveLength(0);
    expect(failedQueue).toHaveLength(1);
    expect(failedQueue[0].payload).toEqual(SALE);
    expect(failedQueue[0].error).toEqual({ code: "23503", message: "fk violation" });
  });

  it("ignores ids that are not in the queue", () => {
    useSyncStore.getState().moveToFailed("missing", { code: "P0001", message: "x" });

    expect(useSyncStore.getState().failedQueue).toHaveLength(0);
  });

  it("puts a failed sale back in the queue with the same payload", () => {
    useSyncStore.getState().addToQueue(SALE);
    useSyncStore.getState().moveToFailed("sale-1", { code: "P0001", message: "x" });

    useSyncStore.getState().retryFailed("sale-1");

    const { syncQueue, failedQueue } = useSyncStore.getState();
    expect(failedQueue).toHaveLength(0);
    expect(syncQueue).toHaveLength(1);
    expect(syncQueue[0].id).toBe("sale-1");
    expect(syncQueue[0].payload).toEqual(SALE);
  });
});

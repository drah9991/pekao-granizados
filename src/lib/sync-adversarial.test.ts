import { describe, it, expect, mock } from "bun:test";

// Mock validation checking helper
const isValidationError = (error: any) => {
  if (!error) return false;
  const code = String(error.code || '');
  const status = Number(error.status || 0);
  const message = String(error.message || '');
  
  return (
    code.startsWith('P') ||
    code.startsWith('23') ||
    (status >= 400 && status < 500) ||
    message.toLowerCase().includes('stock') ||
    message.toLowerCase().includes('insufficient') ||
    message.toLowerCase().includes('no tienes permisos') ||
    message.toLowerCase().includes('obligatorio')
  );
};

// 1. Mocking usePOS.ts handleSync logic
interface MockSyncOrder {
  id: string;
  payload: Record<string, unknown>;
}

describe("Adversarial Sync Queue Tests", () => {
  
  describe("usePOS handleSync behavior", () => {
    it("should remove validation errors and process subsequent successful sales", async () => {
      // Setup mock queue
      let syncQueue: MockSyncOrder[] = [
        { id: "order-validation-fail", payload: { item: "item1" } },
        { id: "order-success-1", payload: { item: "item2" } },
        { id: "order-success-2", payload: { item: "item3" } }
      ];

      const removeFromQueue = (id: string) => {
        syncQueue = syncQueue.filter(item => item.id !== id);
      };

      // Mock RPC function
      const mockSupabaseRpc = async (rpcName: string, args: { sale_data: any }) => {
        if (args.sale_data.item === "item1") {
          return { error: { code: "P0001", message: "Stock insuficiente" } };
        }
        return { error: null };
      };

      // Simulated usePOS handleSync loop
      const pending = [...syncQueue]; // Snapshot as in usePOS.ts
      let successCount = 0;

      for (const order of pending) {
        try {
          const { error } = await mockSupabaseRpc('process_sale', {
            sale_data: order.payload
          });
          if (!error) {
            removeFromQueue(order.id);
            successCount++;
          } else {
            if (isValidationError(error)) {
              removeFromQueue(order.id);
            }
          }
        } catch (e: any) {
          if (isValidationError(e)) {
            removeFromQueue(order.id);
          }
        }
      }

      // Assertions
      expect(successCount).toBe(2);
      expect(syncQueue).toHaveLength(0); // All items (validation error + successful ones) should be removed
    });

    it("should keep network errors in the queue and process subsequent successful sales if online again", async () => {
      // Setup mock queue
      let syncQueue: MockSyncOrder[] = [
        { id: "order-network-fail", payload: { item: "network-error" } },
        { id: "order-success", payload: { item: "success-item" } }
      ];

      const removeFromQueue = (id: string) => {
        syncQueue = syncQueue.filter(item => item.id !== id);
      };

      // Mock RPC function
      const mockSupabaseRpc = async (rpcName: string, args: { sale_data: any }) => {
        if (args.sale_data.item === "network-error") {
          throw new Error("Failed to fetch"); // Network error
        }
        return { error: null };
      };

      // Simulated usePOS handleSync loop
      const pending = [...syncQueue];
      let successCount = 0;

      for (const order of pending) {
        try {
          const { error } = await mockSupabaseRpc('process_sale', {
            sale_data: order.payload
          });
          if (!error) {
            removeFromQueue(order.id);
            successCount++;
          } else {
            if (isValidationError(error)) {
              removeFromQueue(order.id);
            }
          }
        } catch (e: any) {
          if (isValidationError(e)) {
            removeFromQueue(order.id);
          }
          // Note: In usePOS.ts handleSync, if there is a network error thrown, 
          // it logs it but does NOT break the loop. Let's see if this is correct.
        }
      }

      // Assertions
      expect(successCount).toBe(1);
      expect(syncQueue).toHaveLength(1);
      expect(syncQueue[0].id).toBe("order-network-fail"); // Network failure remains in queue
    });
  });

  describe("sw.ts syncOrders behavior", () => {
    it("should remove validation errors and continue processing subsequent orders in the service worker", async () => {
      let syncQueue = [
        { id: "sw-validation-fail", payload: { item: "bad" } },
        { id: "sw-success-1", payload: { item: "good1" } },
        { id: "sw-success-2", payload: { item: "good2" } }
      ];

      const remainingQueue = [...syncQueue];
      let successCount = 0;

      // Simulated Fetch Mock
      const mockFetch = async (url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        const item = body.sale_data.item;

        if (item === "bad") {
          return {
            ok: false,
            status: 409,
            text: async () => "Conflict/Validation Error"
          };
        }

        return {
          ok: true,
          status: 200,
          text: async () => "Success"
        };
      };

      // Simulated sw.ts syncOrders loop
      for (const order of syncQueue) {
        try {
          const response = await mockFetch("https://supabase/rest/v1/rpc/process_sale", {
            method: "POST",
            body: JSON.stringify({ sale_data: order.payload })
          });

          if (response.ok) {
            const index = remainingQueue.findIndex((o: any) => o.id === order.id);
            if (index > -1) {
              remainingQueue.splice(index, 1);
            }
            successCount++;
          } else {
            if (response.status >= 400 && response.status < 500) {
              const index = remainingQueue.findIndex((o: any) => o.id === order.id);
              if (index > -1) {
                remainingQueue.splice(index, 1);
              }
              successCount++; // Trigger saving updated queue back to IDB
            }
          }
        } catch (err) {
          break; // Network failure breaks loop
        }
      }

      // Assertions
      expect(successCount).toBe(3); // 2 success + 1 validation error marked as success to trigger IDB save
      expect(remainingQueue).toHaveLength(0); // All items processed and removed
    });

    it("should break the loop on network failure to avoid out-of-order execution or continuous failures", async () => {
      let syncQueue = [
        { id: "sw-network-fail", payload: { item: "offline" } },
        { id: "sw-success-item", payload: { item: "good" } }
      ];

      const remainingQueue = [...syncQueue];
      let successCount = 0;

      // Simulated Fetch Mock
      const mockFetch = async (url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        const item = body.sale_data.item;

        if (item === "offline") {
          throw new Error("TypeError: Failed to fetch"); // Network error
        }

        return {
          ok: true,
          status: 200,
          text: async () => "Success"
        };
      };

      // Simulated sw.ts syncOrders loop
      for (const order of syncQueue) {
        try {
          const response = await mockFetch("https://supabase/rest/v1/rpc/process_sale", {
            method: "POST",
            body: JSON.stringify({ sale_data: order.payload })
          });

          if (response.ok) {
            const index = remainingQueue.findIndex((o: any) => o.id === order.id);
            if (index > -1) {
              remainingQueue.splice(index, 1);
            }
            successCount++;
          } else {
            if (response.status >= 400 && response.status < 500) {
              const index = remainingQueue.findIndex((o: any) => o.id === order.id);
              if (index > -1) {
                remainingQueue.splice(index, 1);
              }
              successCount++;
            }
          }
        } catch (err) {
          break; // Network failure breaks loop
        }
      }

      // Assertions
      expect(successCount).toBe(0); // No successful processing
      expect(remainingQueue).toHaveLength(2); // Both remain in queue
    });
  });
});

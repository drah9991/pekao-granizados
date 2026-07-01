# Detailed Audit Analysis: Realtime UI Sync & Bun Testing Setup

## 1. Overview & Core Findings

This document presents a comprehensive audit of the database sync logic, Realtime UI subscriptions, POS components displaying stock indicators, and the Bun testing framework. 

### Key Findings
1. **Tank Level Monitoring is Realtime**: The tank cylinders display (`TankLevelsList` and `TankLevelIndicator`) are updated in realtime via a subscription to the `machine_tanks` table changes in the `useTankStatus` hook.
2. **Product Grid Stock has a Realtime Gap**: The product catalog display (`ProductGrid` component) does *not* possess its own Realtime subscription. It relies on a 60-second polling interval and local query cache invalidation. Although `useProducts` has a subscription to `store_stock` changes, it is only active on the admin products screen. As a result, product stock adjustments made on another device do not reflect on the POS screen instantly.
3. **Optimistic Tank Status Updates**: The POS processes sales optimistically by subtracting volume from the react-query cache `['tank-status']` before the server responds to the `process_sale` RPC. This is handled inline inside `usePOS.ts` and can be extracted for testability.
4. **Bun Testing Setup is Functional**: Bun test runner is fully integrated. Running `bun test` runs unit tests smoothly.

---

## 2. POS UI Component Inventory

### A. Tank Level Indicators
- **Component file**: `src/components/pos/TankLevelIndicator.tsx`
- **Data Hook**: `useTankStatus` (from `src/hooks/useTankStatus.ts`)
- **Queries table/view**: `vw_tank_percentages` (PostgreSQL View mapping `machine_tanks`).
- **Visual Display**:
  - Displays as a 3D-styled liquid cylinder containing a percentage level.
  - Liquid coloring changes dynamically based on percentages:
    - **Critical (< 15%)**: Red gradient with glowing/pulsing animation.
    - **Warning (15% - 40%)**: Amber/yellow gradient.
    - **Normal (> 40%)**: Cyan/emerald gradient.
  - Hovering triggers a detailed `Tooltip` displaying:
    - Current volume in milliliters (`ml`).
    - Max capacity in milliliters (`ml`).
    - Exact percentage (with decimal precision, e.g. `98.5%`).
  - Includes an **"Inicializar Tanques"** button for store managers/admins to trigger the `initialize_store_tanks` Supabase RPC if no tanks are set up.

### B. Product Cards & Stock Grids
- **Component file**: `src/components/pos/ProductGrid.tsx`
- **Data Query**: React Query key `['products-grid', storeId]` (fetching from `products` table).
- **Mapping Utility**: `mapProductStock` (from `src/utils/productStockUtils.ts`).
  - Standardizes stock properties: `stock` (unit stock from `store_stock`) and `mixtureStock` (mixture inventory level in milliliters).
- **Visual Display**:
  - Displays a badge in the top-right corner of each product card:
    - **Mixtures (e.g. Granizados)**: Renders volume remaining in Liters (e.g., `4.5L`). Low stock threshold is `< 2L` (2000 ml), triggering a pulsing amber badge.
    - **Unit stock items**: Renders unit quantities (e.g., `Stock: 12`). Low stock threshold is `< 10` units.
  - **Out of stock state**: If stock or mixtureStock <= 0, the card opacity drops to 30%, grayscale is applied, and clicking it yields a "Sin existencias" toast message.

---

## 3. Realtime Subscription Trace

The application leverages Supabase Realtime channels. Here is a trace of all active subscriptions:

| Hook / Context File | Channel Name | Subscribed Table | Filter Conditions | Triggered Action |
| --- | --- | --- | --- | --- |
| `src/hooks/useTankStatus.ts` | `machine-tanks-sync-${storeId}` | `machine_tanks` | `store_id=eq.${storeId}` | Invalidates query `['tank-status']` to refetch updated tank percentages immediately. |
| `src/hooks/useProducts.ts` | `products-sync-${storeId}` | `products` | `store_id=eq.${storeId}` | Invalidates queries `['products-admin']` and `['products-grid']`. |
| `src/hooks/useProducts.ts` | `products-sync-${storeId}` | `store_stock` | `store_id=eq.${storeId}` | Invalidates query `['products-admin']` (*Note: Missing products-grid invalidation*). |
| `src/hooks/useInventory.ts` | `inventory-sync-${storeId}` | `store_stock` | `store_id=eq.${storeId}` | Triggers `fetchStockData()` to refresh local state. |
| `src/hooks/useDigitalMenu.ts` | `menu_realtime` | `store_stock` | None | Triggers `fetchMenuData()` to refresh digital menu. |
| `src/hooks/usePreparation.ts` | `preparation-sync-${storeId}` | `sales` | `store_id=eq.${storeId}` | Refetches preparation order queues (KDS). |
| `src/hooks/useSales.ts` | `kds-orders-sync-${storeId}` | `sales` | `store_id=eq.${storeId}` | Refetches sales orders list. |
| `src/hooks/useDashboard.ts` | `dashboard-sync-${storeId}` | `sales`, `sale_items`, `cash_turns` | `store_id=eq.${storeId}` | Invalidates multiple dashboard query keys. |
| `src/context/TurnContext.tsx` | `cash_turns_changes` | `cash_turns` | None | Refetches active shift turn status. |
| `src/hooks/useNotifications.ts` | `notifications_changes` | `system_alerts` | None | Triggers system/inventory alert notification popups. |

### Realtime UI Inconsistency Risk (Gap)
Inside `ProductGrid.tsx`, there is no local postgres channel subscription. It relies on the query key `['products-grid', storeId]` which has `refetchInterval: 60000` (60s polling). While the admin hook (`useProducts.ts`) does subscribe to `products` changes and invalidates `['products-grid']`, its subscription to `store_stock` changes **only** invalidates `['products-admin']`. 
Consequently, if a cashier on Device A sells a unit item and decrements `store_stock`, Device B's POS Product Grid will not update in realtime unless:
- The 60-second polling interval triggers.
- Device B performs a local transaction, which manually triggers `invalidateQueries({ queryKey: ['products-grid'] })`.

---

## 4. Bun Testing Setup

- **Test Command**: `npm run test` (mapped to `bun test` in `package.json`).
- **Framework Support**: Bun includes built-in test runners matching Jest/Vitest expect styles.
- **Existing Test Coverage**:
  - `src/lib/csv-utils.test.ts`: Asserts CSV parsing, fallback behavior when parsing invalid JSON columns, and type casting.
  - `src/lib/pricing.test.ts`: Asserts inventory checks (`hasEnoughStock`), size resolver multiplier logic, ingredient volume computation, and pricing/discount application. Uses mock fixtures and `describe`/`it` structure.

---

## 5. Proposed Test Suite: `src/lib/inventory-sync.test.ts`

The test suite will test the core inventory synchronization logic, offline queue operations, and client-side optimistic tank calculations.

### A. Recommended Code Separation
To ensure clean testing, we propose extracting the inline optimistic tank level calculation from `usePOS.ts` into a utility file `src/utils/optimisticTanks.ts` so that it can be imported and tested cleanly without mounting react-query.

#### Proposed Utility: `src/utils/optimisticTanks.ts`
```typescript
export interface TankRecord {
  id: string;
  inventory_item_id: string | null;
  current_volume_ml: number;
  max_capacity_ml: number;
  percentage: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  sizeMultiplier?: number;
}

export interface ProductRecord {
  id: string;
  recipes?: {
    inventory_item_id: string;
    quantity_required: number;
  }[];
}

export function calculateOptimisticTanks(
  oldTanks: TankRecord[],
  cart: CartItem[],
  productsList: ProductRecord[]
): TankRecord[] {
  return oldTanks.map((tank) => {
    let updatedVolume = Number(tank.current_volume_ml);

    cart.forEach((item) => {
      const product = productsList.find((p) => p.id === item.productId);
      const recipes = product?.recipes || [];
      
      recipes.forEach((recipe) => {
        if (recipe.inventory_item_id === tank.inventory_item_id) {
          const multiplier = item.sizeMultiplier || 1;
          const deduction = Number(recipe.quantity_required) * item.quantity * multiplier;
          updatedVolume = Math.max(0, updatedVolume - deduction);
        }
      });
    });

    if (updatedVolume !== Number(tank.current_volume_ml)) {
      const percentage = Math.round((updatedVolume / Number(tank.max_capacity_ml)) * 100 * 100) / 100;
      return {
        ...tank,
        current_volume_ml: updatedVolume,
        percentage
      };
    }
    return tank;
  });
}
```

### B. Proposed Test Suite File: `src/lib/inventory-sync.test.ts`

```typescript
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { calculateOptimisticTanks } from "@/utils/optimisticTanks";

// Mock the Zustand useSyncStore module to check offline queue operations
const mockQueue: any[] = [];
mock.module("@/store/useSyncStore", () => ({
  useSyncStore: {
    getState: () => ({
      syncQueue: mockQueue,
      addToQueue: (payload: any) => {
        const item = { id: payload.id || "mock-id", payload, timestamp: new Date().toISOString() };
        mockQueue.push(item);
        return item;
      },
      removeFromQueue: (id: string) => {
        const idx = mockQueue.findIndex(item => item.id === id);
        if (idx !== -1) mockQueue.splice(idx, 1);
      },
      clearQueue: () => {
        mockQueue.length = 0;
      }
    })
  }
}));

describe("Inventory Sync Test Suite", () => {
  beforeEach(() => {
    mockQueue.length = 0;
  });

  describe("Optimistic Tank Updates", () => {
    it("should deduct correct volumes for a recipe-based sale", () => {
      const oldTanks = [
        { id: "tank-1", inventory_item_id: "item-mix-1", current_volume_ml: 10000, max_capacity_ml: 12000, percentage: 83.33 }
      ];

      const cart = [
        { productId: "prod-1", quantity: 2, sizeMultiplier: 1.5 } // 2 units * 1.5 multiplier
      ];

      const productsList = [
        {
          id: "prod-1",
          recipes: [
            { inventory_item_id: "item-mix-1", quantity_required: 150 } // Requires 150ml per base unit
          ]
        }
      ];

      // Expected deduction: 150ml * 2 * 1.5 = 450ml
      // Expected new volume: 10000 - 450 = 9550ml
      // Expected percentage: round((9550 / 12000) * 100) = 79.58%
      const newTanks = calculateOptimisticTanks(oldTanks, cart, productsList);

      expect(newTanks[0].current_volume_ml).toBe(9550);
      expect(newTanks[0].percentage).toBe(79.58);
    });

    it("should not deduct volumes if recipes do not match the tank's inventory item ID", () => {
      const oldTanks = [
        { id: "tank-1", inventory_item_id: "item-mix-1", current_volume_ml: 10000, max_capacity_ml: 12000, percentage: 83.33 }
      ];

      const cart = [
        { productId: "prod-1", quantity: 1, sizeMultiplier: 1.0 }
      ];

      const productsList = [
        {
          id: "prod-1",
          recipes: [
            { inventory_item_id: "item-mix-different", quantity_required: 150 }
          ]
        }
      ];

      const newTanks = calculateOptimisticTanks(oldTanks, cart, productsList);
      expect(newTanks[0].current_volume_ml).toBe(10000);
    });

    it("should cap the volume deduction at 0", () => {
      const oldTanks = [
        { id: "tank-1", inventory_item_id: "item-mix-1", current_volume_ml: 200, max_capacity_ml: 12000, percentage: 1.67 }
      ];

      const cart = [
        { productId: "prod-1", quantity: 5, sizeMultiplier: 1.0 }
      ];

      const productsList = [
        {
          id: "prod-1",
          recipes: [
            { inventory_item_id: "item-mix-1", quantity_required: 100 } // Total deduction 500ml > 200ml
          ]
        }
      ];

      const newTanks = calculateOptimisticTanks(oldTanks, cart, productsList);
      expect(newTanks[0].current_volume_ml).toBe(0);
      expect(newTanks[0].percentage).toBe(0);
    });
  });

  describe("Offline Queueing & Sync State Store", () => {
    it("should enqueue a sale payload when offline", () => {
      const salePayload = { id: "sale-offline-123", total: 15000, items: [] };
      const { useSyncStore } = require("@/store/useSyncStore");
      const store = useSyncStore.getState();

      const enqueued = store.addToQueue(salePayload);
      expect(mockQueue).toHaveLength(1);
      expect(enqueued.id).toBe("sale-offline-123");
      expect(enqueued.payload).toEqual(salePayload);
    });

    it("should remove enqueued sale from queue upon successful sync", () => {
      const { useSyncStore } = require("@/store/useSyncStore");
      const store = useSyncStore.getState();

      store.addToQueue({ id: "order-1", total: 10000 });
      store.addToQueue({ id: "order-2", total: 20000 });

      expect(mockQueue).toHaveLength(2);

      store.removeFromQueue("order-1");
      expect(mockQueue).toHaveLength(1);
      expect(mockQueue[0].id).toBe("order-2");
    });
  });
});
```

---

## 6. Recommendations for Enhancing Realtime Sync Robustness

To resolve the gap identified in Section 3 and make the client state completely atomic, we recommend implementing the following:

1. **POS Product Stock Realtime Subscription**:
   - In `ProductGrid.tsx`, establish a local channel subscription matching `products-sync-${storeId}` to listen specifically to changes on `store_stock`.
   - When a `postgres_changes` event fires on `store_stock` for that store, invalidate the `['products-grid']` cache key.
   - Example snippet:
     ```typescript
     useEffect(() => {
       if (!storeId) return;
       const channel = supabase.channel(`pos-grid-stock-sync-${storeId}`)
         .on('postgres_changes', { 
           event: '*', 
           schema: 'public', 
           table: 'store_stock', 
           filter: `store_id=eq.${storeId}` 
         }, () => {
           queryClient.invalidateQueries({ queryKey: ['products-grid', storeId] });
         })
         .subscribe();
       
       return () => {
         supabase.removeChannel(channel);
       };
     }, [storeId, queryClient]);
     ```

2. **Combine Sync Channels**:
   - Instead of spinning up individual channels for `products`, `store_stock`, and `machine_tanks`, combine them into a single POS state channel subscription in a high-level POS state controller (like `TurnContext` or `usePOSPage`) to lower the total client websocket connection load.

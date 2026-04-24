# Code Documentation - Pekao Granizados

This document explains the technical implementation of core features in the Pekao Granizados POS system.

## 1. Dual-Inventory Architecture

The system tracks inventory on two distinct planes to accommodate the unique nature of granizados (slushies) where the primary consumable is a liquid mixture, but the sales unit is a cup.

### A. Store Stock (Units)
Tracks discrete, count-based items (e.g., cups, lids, pre-packaged snacks, sachets).
*   **Table:** `store_stock`
*   **Update Mechanism:** Direct subtraction/addition of `qty` based on the item sold.

### B. Mixture Inventory (Volume/ml)
Tracks liquid volume in the slushy machines.
*   **Table:** `inventory_items`
*   **Update Mechanism:** Calculated volumetrically using recipes.

**Calculation Formula:**
`Deduction (ml) = Base Volume (oz) * Size Multiplier * 29.57 (oz to ml conversion)`

This allows a single tank to serve multiple sizes (e.g., Small, Large) and deduct the exact correct amount of liquid.

## 2. Atomic Sales Processing

To prevent race conditions during simultaneous sales (e.g., two cashiers selling the last drops of mixture at the exact same time), the system uses a PostgreSQL RPC (Remote Procedure Call) named `process_sale`.

### Flow of `process_sale`:
1.  **Input:** Receives a single JSONB payload (`sale_data`) containing store ID, employee ID, items, and totals.
2.  **Order Creation:** Inserts the header record into the `orders` table.
3.  **Item Processing (Loop):** Iterates over the items:
    *   Inserts into `order_items`.
    *   Deducts units from `store_stock`.
    *   If the product `track_mixture_inventory` is true, fetches the recipe and deducts volume from `inventory_items`.
4.  **Transaction Safety:** The entire function runs inside a single database transaction. If any part fails (e.g., stock constraint violated), the entire sale is rolled back.

### Related RPCs:
*   `update_order_with_stock`: Restores old stock, applies new items, deducts new stock.
*   `cancel_sale_with_stock_restore`: Restores stock completely and marks order as cancelled.

## 3. Frontend State Synchronization

To ensure the UI always reflects the database state after a sale:

*   **React Query:** The POS grid uses TanStack Query to fetch products.
*   **Invalidation:** Upon successful execution of `process_sale`, `usePOS.ts` calls `queryClient.invalidateQueries({ queryKey: ['products-grid'] })`. This forces the grid to re-fetch the latest stock levels instantly.

## 4. Offline-First Capability

If `navigator.onLine` is false:
1.  The sale is saved locally to IndexedDB via `offlineService.saveOfflineOrder()`.
2.  The UI updates to show pending syncs.
3.  When connection is restored, `handleSync()` loops through pending orders and pushes them via the `process_sale` RPC.

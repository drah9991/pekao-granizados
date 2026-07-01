# Client-Side POS Logic Audit Report: Inventory Discount, Restoration, and Sync

## 1. Executive Summary

This report presents a deep audit of the client-side POS (Point of Sale) logic in the Pekao Granizados application. Specifically, we investigate `src/hooks/usePOS.ts`, `src/pages/POS.tsx`, `src/lib/OfflineService.ts`, and related stores and hooks (`useCartStore.ts`, `useSales.ts`, `useTankStatus.ts`, and `sw.ts`).

Our investigation revealed that while the system incorporates advanced features such as offline storage (IndexedDB), Service Worker-driven background sync, and optimistic UI updates for tank levels, there are several architectural gaps that introduce potential race conditions, inventory inconsistencies, stale UI state, and sync queue clogging.

Key findings include:
- **Fire-and-Forget Sale Logic:** Sales are processed asynchronously in the background. Hard business-rule failures (e.g., out-of-stock) are swallowed, treated as network errors, and queued forever in IndexedDB.
- **Asymmetric Optimistic Updates:** Optimistic stock deduction is applied only to tank levels (`vw_tank_percentages`) but not to standard product stock (`store_stock`), leading to race conditions for unit-based items.
- **Missing State Invalidation on Cancellation:** Cancelling an order via the sales dashboard restores database inventory but does not invalidate the client-side POS grids, leaving the cashier with stale, lowered stock numbers.
- **Fragile Offline Tank Monitoring:** Going offline clears the tank monitoring UI completely and prompt cashiers to initialize tanks instead of displaying cached, last-known volumes.

---

## 2. Detailed Sales Initiation & Cart Flow

### 2.1 Cart State and Stock Check
The cart is managed in Zustand via `useCartStore` (`src/store/useCartStore.ts`), which persists to local storage (`pekao-cart-storage`).
- **Product Addition:** When a product is selected, `addToCart()` is called.
- **Stock Validation:** Before adding or updating quantities, the client runs `hasEnoughStock()` or `hasEnoughStockForUpdate()` (defined in `src/lib/pricing.ts`):
  - **Mixture Products (Granizados):** The system checks the required volume in mL:
    $$\text{Requested Volume} = \text{base\_volume} \times \text{sizeMultiplier} \times 29.57\text{ (oz to ml)} \times \text{quantity}$$
    It aggregates this with any matching product volume already in the cart and verifies it against `product.mixtureStock` (fetched from the tank's `inventory_items.stock`).
  - **Unit Products:** It aggregates the quantity of the product already in the cart and checks if it exceeds `product.stock` (fetched from `store_stock.qty`).
- **Prices and Discounts:** Product prices are calculated using `calculateItemPrice()` and `applyPricingRules()`, which apply time-based and target-based rules (percentage or fixed discounts).

### 2.2 Sale Confirmation
When the cashier clicks "Confirmar Pago", the sale confirmation flow triggers:
1. `onConfirmSale` in `usePOSPage.ts` is invoked, which calls `processSale` in `usePOS.ts`.
2. **Payload Mapping:** Cart items are mapped into `mappedItems` (splitting base items from toppings) and structured into a standard `salePayload`. An optimistic order ID is generated.
3. **Optimistic Updates:** `processSale` updates the local query cache for `tank-status` by decrementing the volume of the respective tank matching the recipe components.
4. **Fire-and-Forget IIFE:**
   - Instead of awaiting the network request, `processSale` launches an asynchronous IIFE `(async () => { ... })()` to communicate with Supabase.
   - It immediately returns `orderData` to the caller, triggering a success toast ("¡Venta procesada exitosamente!") and clearing the cart.
   - **If Online:** The IIFE sends `salePayload` to the Supabase RPC `process_sale`. If it succeeds, it invalidates the `products-grid` and `tank-status` query keys. If it fails, it catches the error and moves to the fallback.
   - **If Offline / Error Fallback:** The IIFE calls `useSyncStore.getState().addToQueue(salePayload)` and registers background sync. A warning is shown: *"Red inestable: Venta guardada offline para reintento automático."*

---

## 3. Supabase RPC Integration & Offline Synchronization

### 3.1 Synchronizing Sales
The application has two synchronization paths:
1. **Manual/Connection Sync (`handleSync`):** Triggered when the browser goes back online or when the cashier triggers it via `SyncDrawer.tsx`. It runs a loop in `usePOS.ts` calling `supabaseRpc('process_sale', ...)` for each pending queue item.
2. **Background Sync (`sw.ts`):** Triggered by the browser's `SyncManager` using the `'sync-orders'` tag.

### 3.2 Service Worker Sync Mechanism
In `src/sw.ts`, the background sync retrieves:
- The Zustand queue state from IndexedDB (`sync_store` under key `oasis-eon-sync-queue`).
- The session tokens from IndexedDB (`sync_store` under key `auth-session`).

For each order in the queue, it makes a direct POST fetch to:
```
POST ${supabaseUrl}/rest/v1/rpc/process_sale
Headers: { Authorization: Bearer <accessToken>, apikey: <supabaseKey> }
Body: { sale_data: order.payload }
```
- If the fetch returns `response.ok` (2xx status), the order is removed from the queue.
- If it fails, the service worker logs the error but **does not remove the order** from the queue. It remains in IndexedDB to be retried on subsequent connection changes.

---

## 4. Cancellation Workflow & Client State Impacts

### 4.1 Initiation
Cancellations are managed in `useSales.ts` (`src/hooks/useSales.ts`):
1. The cashier selects an order to cancel, which displays the `CancelOrderDialog` component.
2. Upon confirmation, `handleConfirmCancelWithReason` is invoked.
3. It performs a database update by calling the Supabase RPC `cancel_sale_with_stock_restore` passing `p_order_id` and `p_reason`.

### 4.2 Client State Impact & Inconsistencies
Once the cancellation RPC completes successfully:
- A success toast is displayed: *"Venta cancelada y stock restaurado correctamente"*.
- The sales list is refreshed using `fetchOrders()`.
- The dashboard stats are invalidated via `queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })`.
- **The Bug:** The query keys `['products-grid']` and `['tank-status']` are **NOT** invalidated.
- **Impact:** The database restores the stock correctly, but the client POS interface continues to show the old, lower stock values. A cashier on the POS page will see outdated quantities until they manually refresh the page or wait for the background timer (60s) to trigger a automatic refetch.

---

## 5. Audit of Local Inventory Management & Race Conditions

This section outlines specific scenarios where client-side local inventory tracking can lead to data inconsistencies and race conditions.

### 5.1 Race Condition on Unit Products (e.g., Sachets, Sweets)
- **Mechanism:** Unlike mixture-based products, unit-based products do not receive optimistic updates in the client cache during `processSale`. Instead, their stock levels are only updated when the background `process_sale` RPC completes and invalidates `['products-grid']`.
- **Race Condition:**
  1. Cashier adds the last unit of a sachet (Stock: 1) to the cart and hits "Pagar".
  2. The cart is cleared immediately, the success toast appears, and the sale is processed in the background.
  3. For a window of 1–5 seconds (while the RPC is executing), the product card on the POS grid still displays "Stock: 1" because the cache has not been invalidated.
  4. Another cashier (or the same one) quickly clicks the product card.
  5. The client-side validation (`hasEnoughStock`) checks the cache, sees "Stock: 1", allows the product to enter the cart, and lets the cashier check out.
  6. The second background RPC starts, but fails in the database due to a stock constraint ("Stock insuficiente").
  7. The POS swallows the database error, treats it as a network drop, and pushes the invalid sale into the offline sync queue.

### 5.2 Cluttered Sync Queue (Stuck Orders)
- **Mechanism:** The catch block in `usePOS.ts` does not inspect the error type. Both network dropouts and hard database validation failures (e.g., stock shortage, unauthorized user, constraint violations) are caught and routed to `addToQueue`.
- **Result:** If an order fails due to a business logic violation (like the race condition in 5.1), it is saved in the local sync queue. When the app retries synchronization, the database will reject the order again. Since the service worker and `handleSync` only remove successful orders from the queue, these invalid orders will remain stuck in the queue forever, causing repeated background failures and bloating IndexedDB.

### 5.3 Optimistic Update Desynchronization & Rollback Failure
- **Mechanism:** When a mixture is sold, the client optimistically subtracts the volume from the local `['tank-status']` cache.
- **Desynchronization:** If the background RPC fails, the sale is pushed to the offline queue. At this point:
  - The client UI shows the *decreased* tank volume.
  - The database still holds the *higher* tank volume (since the sale was not processed).
  - No rollback is executed on failure.
  - If a refetch triggers (due to the 60-second polling or window focus), the client fetches the database state, causing the tank indicator to suddenly jump back to the higher volume.
  - If the device is actually offline, the next refetch will fail. However, if the page is reloaded, the grid fetches products from IndexedDB (which holds the old higher stock) and the tank status query returns an empty array, destroying the local optimistic tracking state.

### 5.4 Offline Tank Monitoring UI Breakdown
- **Mechanism:** In `useTankStatus.ts`, the query function catches errors and returns `[]`.
- **Impact:** If the network is lost:
  1. The tank query fails and returns `[]`.
  2. `TankLevelIndicator.tsx` detects `tanks.length === 0`.
  3. Instead of rendering the last-known levels, it shows: *"No hay tanques configurados para esta sucursal"* alongside a button to *"Inicializar Tanques"*.
  4. Cashiers are misled into thinking their configuration is wiped, and clicking "Inicializar" fails since they are offline.

---

## 6. Actionable Recommendations

To resolve these inconsistencies and race conditions, we recommend the following modifications:

1. **Implement Proper Error Categorization in `processSale`:**
   - Modify the catch block in the `processSale` IIFE to check if the error is a network issue (e.g., failed to fetch, timeout) or a database/validation error (e.g., code `23514` check constraint, custom RPC exception message).
   - If it is a hard business logic failure, **do not** enqueue the order in the sync queue. Instead, notify the user immediately and rollback/restore the cart so they can rectify the issue.

2. **Add Optimistic Update for Unit Products:**
   - Extend the optimistic cache modifications in `usePOS.ts` to update `['products-grid', storeId]` in addition to `['tank-status']`. This ensures unit-product stock is reduced in the UI immediately, preventing duplicate checkouts of the same item.

3. **Provide Rollback Handling on Async Failure:**
   - Keep a copy of the pre-sale query data before modifying the cache. If the background process fails with a hard error, restore the original cache state immediately to reflect true inventory.

4. **Correct Invalidations on Cancellation:**
   - In `useSales.ts` (`handleConfirmCancelWithReason`), add invalidation for inventory queries:
     ```typescript
     queryClient.invalidateQueries({ queryKey: ["products-grid"] });
     queryClient.invalidateQueries({ queryKey: ["tank-status"] });
     ```

5. **Cache Tank Status in IndexedDB:**
   - Modify `useTankStatus.ts` to cache tank levels in IndexedDB (e.g., using `offlineService`). When offline, return the cached values instead of an empty array to maintain visibility.

6. **Filter out Invalid Sync Queue Orders:**
   - In `sw.ts` and `handleSync`, if the RPC returns a permanent client error (e.g., `4xx` HTTP code or specific database constraints), remove the order from the queue and send a specific error message to the client so it can be discarded or reviewed, rather than letting it loop indefinitely.

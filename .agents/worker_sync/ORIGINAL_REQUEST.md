## 2026-06-30T15:38:46Z
You are a teamwork_preview_worker agent.
Your working directory is: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\worker_sync

Your mission is to implement real-time inventory discount on POS sales and cancellations, and validate it via automated Bun tests, following the audit recommendations from the Explorers.

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Here is the plan of changes you need to perform:

1. **Database Migration**:
   - Create a new migration file under `supabase/migrations/20260630000000_inventory_realtime_sync.sql` (or append to/update the latest schema/migrations safely) to redefine the following database functions:
     - `public.process_sale(sale_data jsonb)`:
       - Sort loop items by `product_id` to avoid deadlock conditions.
       - Sort recipe items loop by `r.inventory_item_id` to avoid deadlock conditions.
       - Remove the explicit UPDATE statements to `public.machine_tanks` table (let the trigger `trg_sync_inventory_to_machine_tanks` handle the volume update from `inventory_items.stock` dynamically).
     - `public.update_order_with_stock(order_update_data jsonb)`:
       - Sort loops over items by `product_id` to avoid deadlocks.
       - Remove explicit UPDATE statements to `public.machine_tanks`.
     - `public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)`:
       - Sort loop over order items by `product_id`.
       - Remove explicit UPDATE statements to `public.machine_tanks`.
     - `public.check_inventory_stock_trigger()`:
       - Redefine to reference `NEW.unit` instead of the non-existent `NEW.unit_of_measure`.
     - Performance tuning indexes (if not already present):
       - Add index `idx_machine_tanks_item ON public.machine_tanks(inventory_item_id, store_id)`.
       - Drop redundant index `idx_store_stock_store_product` on `public.store_stock(store_id, product_id)` (since it already has a UNIQUE constraint on those columns).

2. **Frontend Component Changes**:
   - `src/components/inventory/RecipeBuilder.tsx`:
     - Fix the query and code references so that it selects and uses `unit` instead of the non-existent `unit_of_measure` from `inventory_items`.
   - `src/lib/OfflineService.ts`:
     - Add `saveTanks(tanks: Record<string, unknown>[])` and `getTanks(): Promise<Record<string, unknown>[]>` to store/retrieve machine tank status list in/from `sync_store` IndexedDB key-value table.
   - `src/hooks/useTankStatus.ts`:
     - Inside `queryFn`, save the fetched tanks using `offlineService.saveTanks(data)`.
     - In the `catch` block, fetch and return cached tanks using `offlineService.getTanks()`. If not found, throw the error (do not return `[]` immediately, which wipes out the React Query cache).
   - Extract optimistic update logic from `src/hooks/usePOS.ts` into a new pure utility file: `src/lib/inventory-sync-utils.ts`:
     - Define `calculateOptimisticTanks(cart, oldTanks, productsList)`
     - Define `calculateOptimisticProducts(cart, oldProducts)`
     - Export these functions so they can be unit-tested.
   - `src/hooks/usePOS.ts`:
     - Import the optimistic helpers.
     - Apply optimistic updates to both tank levels AND product stock in `products-grid` cache when checkout is processed.
     - Await the RPC call directly in the main try/catch block if `isOnline` is true (instead of running it in a background IIFE fire-and-forget).
     - If RPC error occurs, check if it's a validation error (code starts with 'P' or '23', or status 400-499). If so, throw it directly to show the error (e.g. out of stock) to the cashier. If it's a network error, enqueue it offline.
     - In `handleSync`, check if the error is a validation error. If so, remove the order from the queue so it doesn't clog the queue.
     - Add a Supabase Realtime channel subscription in `usePOS.ts` `useEffect` that listens to `products`, `store_stock`, and `inventory_items` tables for the current `storeId`, and invalidates `['products-grid']` query on any update.
   - `src/sw.ts`:
     - In `syncOrders`, if `response.status >= 400 && response.status < 500` (non-retryable client error), remove the failed order from the queue to prevent clogging.
   - `src/hooks/useSales.ts`:
     - In `handleConfirmCancelWithReason`, call `queryClient.invalidateQueries` for `["products-grid"]` and `["tank-status"]` on success.

3. **Automated Verification Tests**:
   - Create `src/lib/inventory-sync.test.ts` to test:
     1. Unit sale inventory deduction (both database mock/assertions and client-side optimistic functions).
     2. Recipe-based mixture sale (exact volume calculations).
     3. Cancellation (restoring exact quantities).
     4. Sync queue non-retryable error handling.
   - Run the Bun test suite and confirm that all tests pass.

# Handoff Report — challenger_sync_1

## 1. Observation
I directly observed the following files and outputs:
- **Test execution results**: Running `bun test src/lib/inventory-sync.test.ts` returned:
  ```
  bun test v1.3.14 (0d9b296a)
  src\lib\inventory-sync.test.ts:
  (pass) Inventory Real-time Sync Tests > 1. Unit Sale Inventory Deduction > should correctly calculate optimistic product stock decrement [1.89ms]
  (pass) Inventory Real-time Sync Tests > 1. Unit Sale Inventory Deduction > database simulation should sort items by product_id to prevent deadlocks [0.65ms]
  (pass) Inventory Real-time Sync Tests > 2. Recipe-based Mixture Sale Volume Calculations > should calculate correct ml deduction using the exact database formula [0.67ms]
  (pass) Inventory Real-time Sync Tests > 2. Recipe-based Mixture Sale Volume Calculations > database simulation should sort recipe items by inventory_item_id to prevent deadlocks [0.08ms]
  (pass) Inventory Real-time Sync Tests > 3. Cancellation & Restoration > should calculate exact quantities to restore upon cancellation [0.03ms]
  (pass) Inventory Real-time Sync Tests > 3. Cancellation & Restoration > should calculate exact mixture volumes to restore on recipe-based product cancellation [0.01ms]
  (pass) Inventory Real-time Sync Tests > 4. Sync Queue Non-Retryable Error Handling > should classify validation errors as non-retryable [0.11ms]
  (pass) Inventory Real-time Sync Tests > 4. Sync Queue Non-Retryable Error Handling > should prune validation errors from queue and keep network errors [0.06ms]

   8 pass
   0 fail
  ```
- **Migration file**: `supabase/migrations/20260630000000_inventory_realtime_sync.sql` contains sorting loops in `process_sale`, `update_order_with_stock`, and `cancel_sale_with_stock_restore` to prevent deadlocks. For instance, in `process_sale` (lines 68-70):
  ```sql
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
      product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
  ) ORDER BY product_id ASC NULLS LAST
  ```
  And the recipe loop (lines 101-106):
  ```sql
  FOR recipe_row IN 
      SELECT r.inventory_item_id, r.quantity_required, ii.unit
      FROM public.recipes r
      JOIN public.inventory_items ii ON r.inventory_item_id = ii.id
      WHERE r.product_id = v_item.product_id
      ORDER BY r.inventory_item_id ASC
  ```
- **Update order RPC**: `update_order_with_stock` (lines 137-271 of the same migration) locks and restores old order items, then deletes `order_items`, and then locks and deducts new order items.
- **Trigger file**: `supabase/migrations/20260522000100_sync_tanks_triggers.sql` contains trigger `sync_inventory_to_machine_tanks()`, which runs `ON CONFLICT (store_id, name) DO UPDATE SET inventory_item_id = EXCLUDED.inventory_item_id`. It maps the tank name using:
  ```sql
  COALESCE(NULLIF(REPLACE(NEW.name, 'Mezcla ', ''), ''), NEW.name)
  ```
- **Agent Tool file**: `pekao-agent/agent/tools/get-low-stock.ts` (lines 41 and 74) references `unit_of_measure`:
  ```typescript
  41: .select("id, name, stock, min_stock, unit_of_measure, is_mixture, store_id, stores(name)")
  74: const unit = item.unit_of_measure ?? (isMixture ? "mL" : "uds");
  ```
  However, the database type in `src/integrations/supabase/types.ts` is `unit`:
  ```typescript
  285: unit: string | null
  ```

---

## 2. Logic Chain
1. **Deadlock in Order Updates**: 
   - Observation: `update_order_with_stock` processes order updates in two distinct serial phases: first restoring old items and then deducting new items.
   - Observation: In both phases, it locks rows on `store_stock` and `inventory_items` sorted by `product_id` and `inventory_item_id`.
   - Inference: However, if Transaction A updates Order 1 (old: Product B, new: Product A) and Transaction B updates Order 2 (old: Product A, new: Product B) concurrently, Transaction A locks Product B during its restore phase, while Transaction B locks Product A. When they proceed to the deduction phase, Transaction A blocks on Product A (held by B) and Transaction B blocks on Product B (held by A). This results in a deadlock cycle.
2. **Infinite Sync Loops on RLS/Permission Denials**:
   - Observation: `isValidationError` checks HTTP 4xx, code `'P0001'`, and codes starting with `'23'`, but doesn't check PostgreSQL permission denial code `'42501'`.
   - Inference: If a sync request fails permanently due to a permission denial (`'42501'`), it will not be classified as a validation error and will remain in the client queue, causing the sync loop to retry indefinitely and waste bandwidth.
3. **Machine Tank Mapping Collision**:
   - Observation: The unique constraint on `machine_tanks` is `(store_id, name)`.
   - Observation: The sync trigger maps names by replacing "Mezcla ".
   - Inference: If one item is named "Mezcla Fresa" and another "Fresa" in the same store, they resolve to the same name "Fresa". Their trigger executions will conflict, constantly overwriting the `inventory_item_id` and volume of the single `"Fresa"` tank.
4. **Broken Agent Tool**:
   - Observation: The database column was renamed to `unit` (as typed in `types.ts` and joined in `ii.unit`).
   - Observation: The helper tool `pekao-agent/agent/tools/get-low-stock.ts` queries `unit_of_measure`.
   - Inference: Calling the `get-low-stock` tool will result in a runtime PostgreSQL error `column inventory_items.unit_of_measure does not exist`, rendering the tool broken.

---

## 3. Caveats
- I did not test the actual database deadlock in a live PostgreSQL instance with multi-client concurrency. These scenarios are derived from logical analysis of PL/pgSQL locking behavior under isolation levels.
- I assumed the running database matches the generated types `src/integrations/supabase/types.ts` (which lists `unit` on `inventory_items`).

---

## 4. Conclusion
- The inventory sync math formulas and client-side optimistic calculation utils are correct and match the database logic.
- The `process_sale` and `cancel_sale_with_stock_restore` functions are robust against deadlocks when executed concurrently.
- The `update_order_with_stock` RPC remains vulnerable to deadlocks under concurrent order updates.
- The agent tool `get-low-stock.ts` is broken due to the schema change.
- Several edge cases in error pruning, tank collisions, and null stock constraints should be addressed.

---

## 5. Verification Method
- **Run the tests**: Execute `bun test src/lib/inventory-sync.test.ts` in the workspace directory.
- **Inspect SQL Code**: Examine `supabase/migrations/20260630000000_inventory_realtime_sync.sql` to verify loop sorting order.
- **Inspect TypeScript Schema**: Verify the fields on `inventory_items` in `src/integrations/supabase/types.ts`.

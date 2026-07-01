# Handoff Report — Inventory Discount and Restoration Schema Audit

## 1. Observation

Direct code observations from the repository:

* **Trigger and RPC Double Update**:
  * **File**: `supabase/migrations/20260629000000_fix_null_product_process_sale.sql` (and `supabase_full_schema.sql` at lines 5778-5785):
    ```sql
    UPDATE public.inventory_items 
       SET stock = stock - v_deduction, 
           updated_at = NOW()
     WHERE id = recipe_row.inventory_item_id AND store_id = v_store_id;

    -- Deduct from machine tanks atomically
    UPDATE public.machine_tanks
       SET current_volume_ml = GREATEST(0, current_volume_ml - v_deduction),
           updated_at = NOW()
     WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_store_id;
    ```
  * **File**: `supabase/migrations/20260522000100_sync_tanks_triggers.sql` (and `supabase_full_schema.sql` lines 5574-5577):
    ```sql
    CREATE TRIGGER trg_sync_inventory_to_machine_tanks
    AFTER INSERT OR UPDATE OF stock, name, is_mixture, store_id ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_inventory_to_machine_tanks();
    ```
    Trigger function code (`sync_inventory_to_machine_tanks`):
    ```sql
    ON CONFLICT (store_id, name) DO UPDATE
    SET inventory_item_id = EXCLUDED.inventory_item_id,
        current_volume_ml = EXCLUDED.current_volume_ml,
        updated_at = NOW();
    ```

* **Schema Inconsistencies (`unit` vs `unit_of_measure`)**:
  * **File**: `src/integrations/supabase/types.ts` lines 277-291, where `inventory_items` is defined:
    ```typescript
    inventory_items: {
      Row: {
        id: string
        store_id: string
        name: string
        stock: number
        min_stock: number | null
        is_mixture: boolean
        unit: string | null
        created_at: string | null
      }
    ```
  * **File**: `supabase_full_schema.sql` line 1723 (in trigger `check_inventory_stock_trigger()`):
    ```sql
    'El artículo "' || NEW.name || '" tiene un stock de ' || NEW.stock || ' ' || NEW.unit_of_measure || '. El mínimo es ' || NEW.min_stock || '.',
    ```
  * **File**: `src/components/inventory/RecipeBuilder.tsx` line 44:
    ```typescript
    .select('id, name, unit_of_measure')
    ```

* **Unsorted Loop Concurrency**:
  * **File**: `supabase/migrations/20260629000000_fix_null_product_process_sale.sql`, lines 67-69:
    ```sql
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(
        product_id uuid, quantity numeric, price numeric, name text, size text, size_multiplier numeric
    )
    LOOP
    ```

* **Redundant Index**:
  * **File**: `supabase_full_schema.sql` line 165:
    ```sql
    unique(store_id, product_id)
    ```
    And line 425:
    ```sql
    create index idx_store_stock_store_product on public.store_stock(store_id, product_id);
    ```

---

## 2. Logic Chain

1. **Trigger Double Execution**: When `process_sale` updates `inventory_items.stock` (Observation 1), the update fires the `trg_sync_inventory_to_machine_tanks` trigger (Observation 1). The trigger function runs an `INSERT ... ON CONFLICT DO UPDATE` statement that sets `machine_tanks.current_volume_ml` to `NEW.stock` (which is `old_stock - v_deduction`). After the trigger completes, control returns to `process_sale`, which immediately executes a second update statement: `UPDATE machine_tanks SET current_volume_ml = current_volume_ml - v_deduction`. This results in `current_volume_ml` being set to `(old_stock - v_deduction) - v_deduction = old_stock - 2 * v_deduction`.
2. **Double Restoration**: The same double-execution logic applies to `cancel_sale_with_stock_restore` and `update_order_with_stock` (restoring stock to `inventory_items` fires the trigger, setting the tank to the new stock, and then the RPC adds `v_val` again, leading to `old_stock + 2 * v_val`).
3. **Database Schema Exception**: Based on generated Typescript types (Observation 2), the database table `inventory_items` only has a `unit` column (no `unit_of_measure`). However, the Postgres trigger `check_inventory_stock_trigger()` (Observation 2) and the frontend code in `RecipeBuilder.tsx` (Observation 2) reference `unit_of_measure`. This results in:
   * A **runtime database crash** (`column NEW.unit_of_measure does not exist`) whenever `inventory_items` stock is updated (crashing all POS checkouts).
   * A **frontend query failure** when loading the Recipe Builder.
4. **Deadlock Vulnerability**: `process_sale` loops over cart items in arbitrary order (Observation 3). Two concurrent checkouts containing the same products but processed in different orders will attempt to lock `store_stock` rows in opposing orders, leading to database deadlocks.
5. **Redundant Indexing**: The `store_stock` table defines a unique constraint (Observation 4) which implicitly creates a unique index on `(store_id, product_id)`. The explicit creation of `idx_store_stock_store_product` on the same columns is therefore redundant, wasting disk space and slowing down updates.

---

## 3. Caveats

* Assumes that the actual running database contains a column named `unit` on `inventory_items`, as defined in the generated `types.ts`. If the database actually has `unit_of_measure`, then `process_sale` itself and the TypeScript types are broken.
* Assumes that POS transactions are exclusively triggered by users who have roles in `profiles`/`user_roles` (i.e. `auth.uid()` is populated). If automated background calls are ever made, the role validation check in `cancel_sale_with_stock_restore` will fail since `auth.uid()` is null.

---

## 4. Conclusion

The audit identifies two critical bugs, one deadlock vulnerability, and two database schema optimizations:
1. **Critical Bug 1**: A **Double Deduction / Double Restoration bug** on `machine_tanks`, causing tanks to deplete 2x faster than normal and restore 2x more on cancellation.
2. **Critical Bug 2**: A **Schema Mismatch bug** (`unit` vs `unit_of_measure`) on `inventory_items` that causes a database crash in the low stock trigger and page fetch errors in the frontend.
3. **Concurrency Vulnerability**: **Deadlock risk** in the unsorted loops in `process_sale` and `update_order_with_stock`.
4. **Optimizations**: A **redundant index** on `store_stock` and **missing indexes** on `machine_tanks(inventory_item_id)`.

### Actionable Remedies
* **Fix Bug 1**: Delete the explicit `UPDATE machine_tanks` statements from `process_sale`, `cancel_sale_with_stock_restore`, and `update_order_with_stock`. The trigger `trg_sync_inventory_to_machine_tanks` on `inventory_items` is sufficient to keep the tank volume in sync with the stock.
* **Fix Bug 2**: Standardize the column name in the database.
  * Update the trigger function `check_inventory_stock_trigger()` to reference `NEW.unit` instead of `NEW.unit_of_measure`.
  * Update `RecipeBuilder.tsx` and `get-low-stock.ts` to query `unit` instead of `unit_of_measure`.
* **Fix Concurrency**: Add `ORDER BY product_id` inside the `jsonb_to_recordset` query in the RPCs to process and lock products in a consistent order.
* **Fix Optimizations**: Drop index `idx_store_stock_store_product` and add index `idx_machine_tanks_item ON public.machine_tanks(inventory_item_id, store_id)`.

---

## 5. Verification Method

1. **Trigger/Double-Deduction Verification**:
   * Complete a sale for a mixture-based product with a known recipe deduction (e.g. 100ml).
   * Check both `inventory_items.stock` and `machine_tanks.current_volume_ml` before and after.
   * If the bug is present, `inventory_items` stock will decrease by 100ml, but `machine_tanks` will decrease by 200ml.
2. **Schema Mismatch Verification**:
   * Execute an update on any `inventory_items` row.
   * If the database has `unit` but trigger references `unit_of_measure`, it will fail with `column NEW.unit_of_measure does not exist`.
   * Open the Recipe Builder page and observe if the network request fails.
3. **Test Suite execution**:
   * If Bun is installed: `bun test`

# Detailed Database Schema Audit Report — Inventory Discount and Restoration

This document presents a comprehensive audit of the backend database schema, functions, triggers, and locking mechanisms related to inventory deduction and restoration in the Pekao POS application.

---

## 1. Schema & Table Mapping

The application's schema represents transactions using `orders` and `order_items` rather than tables named `sales` or `sale_items`. Below is the mapping of relevant tables:

| Logical Table | Actual DB Table | Description |
|---|---|---|
| `sales` | `public.orders` | Stores transaction headers (subtotal, total, tax, tip, delivery fee, payment details, store, etc.). |
| `sale_items` | `public.order_items` | Stores itemized lines for each order (product, quantity, size, price, size multiplier). |
| `store_stock` | `public.store_stock` | Tracks unit-based product stock levels (for pre-packaged items, toppings, etc.) per store. |
| `inventory_items` | `public.inventory_items` | Tracks raw ingredients or mixtures (granizado bases) per store. |
| `machine_tanks` | `public.machine_tanks` | Tracks physical granizado machine tanks, linking them to an `inventory_item_id`. |
| `recipes` | `public.recipes` | Maps products (e.g., specific granizado flavors/sizes) to their raw ingredients. |

---

## 2. Sale Processing and Cancellation RPCs

The critical business logic for stock deduction and restoration is implemented in the following PL/pgSQL functions (re-created and patched in migration `20260629000000_fix_null_product_process_sale.sql`):
1. **`public.process_sale(sale_data jsonb)`**: Called during POS checkout. Inserts the order, inserts order items, and deducts stock from `store_stock`, `inventory_items`, and `machine_tanks`.
2. **`public.cancel_sale_with_stock_restore(p_order_id uuid, p_reason text)`**: Called when an order is cancelled. Sets order status to `'cancelled'` and restores all deducted quantities to their respective tables.
3. **`public.update_order_with_stock(order_update_data jsonb)`**: Called when an order is updated by an admin/manager. Restores old items, deletes old `order_items`, updates the order header, applies new items, and deducts stock accordingly.

---

## 3. Stock Deduction & Restoration Logic Trace

For each item in the cart (`v_item` in `process_sale`):
1. **Product Type Check**: The function checks `pt.track_mixture_inventory` in `product_types_config` for the product type.
2. **Unit-based Stock Deduction (`store_stock`)**:
   - The quantity `v_item.quantity` is subtracted from `store_stock.qty` where `product_id = v_item.product_id` and `store_id = v_store_id`.
   - An exit movement is logged in `public.movements`.
3. **Mixture-based Ingredient Deduction (`inventory_items` & `machine_tanks`)**:
   - If `v_is_tracked_mixture` is `true`, the function loops through all ingredients in `public.recipes` for that product.
   - For each recipe ingredient, it locks the `inventory_items` row (`SELECT ... FOR UPDATE`) to read `v_current_stock`.
   - **Math Formula Calculation**:
     - **For `'ml'` unit ingredients**:
       $$\text{Deduction} = \text{quantity\_required} \times \text{base\_volume} \times \text{size\_multiplier} \times 29.57 \times \text{quantity}$$
       *(29.57 converts fluid ounces to milliliters).*
     - **For other unit ingredients**:
       $$\text{Deduction} = \text{quantity\_required} \times \text{quantity} \times \text{size\_multiplier}$$
   - The calculated deduction is:
     1. Subtracted from `inventory_items.stock`.
     2. Subtracted from `machine_tanks.current_volume_ml` using `GREATEST(0, current_volume_ml - v_deduction)`.
4. **Symmetric Restoration**: When a sale is cancelled or updated, the formulas are run in reverse (adding the quantities instead of subtracting), with `machine_tanks.current_volume_ml` capped using `LEAST(max_capacity_ml, current_volume_ml + v_val)`.

---

## 4. Race Conditions, Concurrency, and Logic Bugs

### 🚨 Critical Bug 1: Machine Tanks Double Deduction and Double Restoration
* **Observation**: In `process_sale`, `update_order_with_stock`, and `cancel_sale_with_stock_restore`, the RPC explicitly runs an `UPDATE public.machine_tanks` statement. However, there is a trigger `trg_sync_inventory_to_machine_tanks` defined on `inventory_items`:
  ```sql
  CREATE TRIGGER trg_sync_inventory_to_machine_tanks
  AFTER INSERT OR UPDATE OF stock, name, is_mixture, store_id ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_inventory_to_machine_tanks();
  ```
  This trigger updates `machine_tanks.current_volume_ml` to match `NEW.stock` (which is `old_stock - v_deduction`).
* **Logic Chain**:
  1. The RPC executes: `UPDATE public.inventory_items SET stock = stock - v_deduction ...`
  2. This triggers `sync_inventory_to_machine_tanks()` which updates the matching row in `machine_tanks` setting `current_volume_ml = NEW.stock` (i.e. `old_stock - v_deduction`).
  3. The RPC immediately executes the next statement:
     ```sql
     UPDATE public.machine_tanks
        SET current_volume_ml = GREATEST(0, current_volume_ml - v_deduction)
      WHERE inventory_item_id = recipe_row.inventory_item_id AND store_id = v_store_id;
     ```
  4. Since the trigger just updated `current_volume_ml` to `old_stock - v_deduction`, this update reads the new value and subtracts `v_deduction` a second time.
  5. The final value in `machine_tanks.current_volume_ml` becomes `old_stock - 2 * v_deduction`.
* **Impact**: The physical tank volume in the database depletes **twice as fast** as the actual ingredients are sold, causing incorrect frontend tank readings and false warnings. During order cancellations, the volume is **double-restored**, adding twice the amount back.

### 🚨 Critical Bug 2: Database Schema Mismatch (`unit` vs `unit_of_measure`)
* **Observation**: The `inventory_items` table was initially created with a `unit_of_measure` column. However, `src/integrations/supabase/types.ts` lists the column name as `unit` (with no `unit_of_measure` present). 
  - In `20260629000000_fix_null_product_process_sale.sql`, the SQL query joins on `ii.unit` and uses `recipe_row.unit`.
  - In `check_inventory_stock_trigger()` (recreated in `supabase_full_schema.sql`), it references `NEW.unit_of_measure`.
  - In the frontend (`RecipeBuilder.tsx` and `get-low-stock.ts`), the code selects `unit_of_measure`.
* **Logic Chain**: If a column was renamed manually in the database (e.g. from `unit_of_measure` to `unit`) without applying the change consistently:
  - If the database only has `unit`, then the trigger `check_inventory_stock_trigger()` will **fail and raise a runtime database exception** whenever `inventory_items` is updated, crashing the entire POS transaction.
  - Furthermore, frontend pages like `RecipeBuilder.tsx` will fail to fetch recipes because they query the non-existent column `unit_of_measure`.
  - If the database has `unit_of_measure`, then `process_sale` will crash on the `ii.unit` select.
* **Impact**: This mismatch causes runtime crashes on either transaction completion or setting adjustments, depending on which column is physically present in the database.

### ⚠️ Concurrency Bug: Deadlock Risk in Unsorted Cart Loops
* **Observation**: In `process_sale` and `update_order_with_stock`, the function loops through the cart items provided in the JSON array:
  ```sql
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_cart_items) AS x(...)
  ```
  The items are processed in the arbitrary order they are sent by the client.
* **Logic Chain**:
  1. If User A checkouts `[Product 1, Product 2]` and User B checkouts `[Product 2, Product 1]` concurrently.
  2. Transaction A locks Product 1 in `store_stock`.
  3. Transaction B locks Product 2 in `store_stock`.
  4. Transaction A attempts to lock Product 2 (blocks, waiting for Transaction B).
  5. Transaction B attempts to lock Product 1 (blocks, waiting for Transaction A).
  6. **Deadlock detected!** PostgreSQL aborts and rolls back one of the transactions.
* **Impact**: Transactions are aborted, displaying raw database errors to users and failing POS checkouts.
* **Remedy**: Sort the items by `product_id` (e.g., adding `ORDER BY product_id` in the loop's `SELECT`) to guarantee a consistent locking order across all concurrent transactions.

### 🔍 Optimization: Redundant Index on `store_stock`
* **Observation**: `store_stock` table defines a unique constraint `UNIQUE (store_id, product_id)`, which automatically creates a unique index. However, `supabase_full_schema.sql` also explicitly creates `idx_store_stock_store_product` on `(store_id, product_id)`.
* **Impact**: Redundant indexes waste disk space and slow down inserts/updates since both index trees must be modified.

---

## 5. Verification and Prevention Mechanisms

* **Check Constraints Safeguard**: Both `store_stock.qty` and `inventory_items.stock` have `CHECK (qty >= 0)` and `CHECK (stock >= 0)` constraints. If a concurrent sale attempts to discount more than the available stock, the constraint throws an error, causing the entire transaction to safely rollback (no negative stock occurs).
* **Consistent Lock Hierarchy**: The functions consistently acquire locks on `store_stock` first (implicitly during `UPDATE`), then `inventory_items` second (`SELECT FOR UPDATE`), and finally `machine_tanks` third. This consistent order prevents deadlocks between different tables.

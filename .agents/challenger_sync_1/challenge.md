# Adversarial Review Challenge Report

## Challenge Summary

**Overall risk assessment**: MEDIUM

While the local test suite passes and the primary `process_sale` deadlock ordering issue (sorting by `product_id` and `inventory_item_id`) has been successfully addressed in the latest migration (`20260630000000_inventory_realtime_sync.sql`), several critical adversarial risks remain in order updates, error handling, tank mapping triggers, and null constraints.

---

## Challenges

### [High] Challenge 1: Deadlock Vulnerability in `update_order_with_stock`

- **Assumption challenged**: That sorting loops internally inside `update_order_with_stock` prevents all deadlocks.
- **Attack scenario**: Two concurrent transactions updating different orders that share the same products, but in opposite roles (e.g., swapping Order 1 from Product B to Product A, and swapping Order 2 from Product A to Product B).
  1. Transaction A starts `update_order_with_stock` for Order 1 (old item: Product B, new item: Product A).
  2. Transaction B starts `update_order_with_stock` for Order 2 (old item: Product A, new item: Product B).
  3. Transaction A restores old items, acquiring a write lock (`FOR UPDATE`) on Product B `store_stock` and its recipes.
  4. Transaction B restores old items, acquiring a write lock on Product A `store_stock` and its recipes.
  5. Transaction A attempts to apply new items, trying to lock Product A `store_stock` -> blocks waiting for Transaction B.
  6. Transaction B attempts to apply new items, trying to lock Product B `store_stock` -> blocks waiting for Transaction A.
  7. **Deadlock detected**: PostgreSQL aborts one of the transactions.
- **Blast radius**: Aborted updates, POS errors visible to managers, and failed order adjustments.
- **Mitigation**: Implement **one-pass sorted locking** in `update_order_with_stock`. Before performing any row updates or restorations, compile the unified set of all product IDs and inventory item IDs involved in both the old order items and new order items. Acquire locks for all of them upfront, in sorted order, in a single query or sequential loop before executing any updates/restorations.

### [Medium] Challenge 2: Indefinite Retries for Permissive/RLS Database Failures

- **Assumption challenged**: That the validation error check `isValidationError` covers all non-retryable/permanent database errors.
- **Attack scenario**: A POS sync operation fails due to a Row Level Security (RLS) policy or a database permission error that does not return HTTP 4xx, PL/pgSQL code `'P0001'`, or constraint violation code starting with `'23'`. For instance, a native PostgreSQL permission error throws code `'42501'` with an English message like `"permission denied for table orders"`.
  - The error is classified as transient (non-validation) because it doesn't match any criteria in `isValidationError`.
  - The POS client keeps retrying the sync operation indefinitely in the background, consuming network bandwidth and spamming database connection logs.
- **Blast radius**: Client sync queue gets stuck on a permanently unauthorized payload, preventing subsequent valid orders in the queue from being processed (if queue processing is FIFO and blocking) or wasting CPU/bandwidth/battery.
- **Mitigation**: Expand `isValidationError` in `src/hooks/usePOS.ts` and `src/lib/inventory-sync.test.ts` to check for PostgreSQL permission/privilege codes (such as `'42501'`), or classify any non-network, non-server-timeout error as a permanent validation error, or limit the maximum number of retries for any queued item before discarding it.

### [Low] Challenge 3: Machine Tank Mappings Thrashing on Name Collisions

- **Assumption challenged**: That inventory items' names will always resolve uniquely when stripping "Mezcla ".
- **Attack scenario**: Two inventory items exist in the same store: Item 1 named "Mezcla Fresa" (stock 5000) and Item 2 named "Fresa" (stock 3000). Both resolve to the name "Fresa" under the trigger expression: `COALESCE(NULLIF(REPLACE(NEW.name, 'Mezcla ', ''), ''), NEW.name)`.
  - Because `machine_tanks` has a unique constraint on `(store_id, name)`, whenever Item 1 is updated, the trigger updates the tank `"Fresa"` to map to Item 1 and updates volume to 5000.
  - Whenever Item 2 is updated, the trigger updates the tank `"Fresa"` to map to Item 2 and updates volume to 3000.
  - In a system with both items, they will continuously stomp on each other's tank mappings (`inventory_item_id`) and volumes in the `machine_tanks` table, causing incorrect readings and wrong stock deductions.
- **Blast radius**: Mismatched tank volume reports, wrong inventory associations, and incorrect POS mixture deductions.
- **Mitigation**: Ensure that `machine_tanks` utilizes the `inventory_item_id` directly for uniqueness, or enforce unique naming constraints on `inventory_items` at the schema level, or modify the trigger to throw an exception/log a warning if a name collision occurs.

### [Low] Challenge 4: Null `min_stock` Disables Low Stock Alerts

- **Assumption challenged**: That all inventory items will have a valid numerical `min_stock` to trigger alerts.
- **Attack scenario**: An inventory item is created or updated with `min_stock` set to NULL.
  - The condition `NEW.stock <= NEW.min_stock` in `check_inventory_stock_trigger` evaluates to NULL, preventing notifications from ever being sent, even if stock goes to 0.
- **Blast radius**: Cashiers and managers do not receive warnings when crucial ingredients run out.
- **Mitigation**: Enforce a `NOT NULL` constraint on `min_stock` with a default of `0` in `inventory_items` table schema, or handle `NULL` values in the trigger condition (e.g. `COALESCE(NEW.min_stock, 0)`).

### [Medium] Challenge 5: Broken Agent Tool `get-low-stock.ts` due to Schema Mismatch

- **Assumption challenged**: That the agent tools do not need to be updated when the database schema changes.
- **Attack scenario**: When the orchestrator or an external agent runs the `get-low-stock` tool, it queries the database table `inventory_items` selecting the column `unit_of_measure`.
  - Because `unit_of_measure` was renamed to `unit` in the database, the Supabase query fails and throws an error: `Error: Error consultando inventory_items: column inventory_items.unit_of_measure does not exist`.
- **Blast radius**: External agent queries fail, preventing automated stock warnings and diagnostic reports.
- **Mitigation**: Update `pekao-agent/agent/tools/get-low-stock.ts` at line 41 to select `unit` instead of `unit_of_measure`, and at line 74 to use `item.unit` instead of `item.unit_of_measure`.

---

## Stress Test Results

- **Offline Sync Queue Pruning** → network error is kept; validation error is discarded → Simulated in `inventory-sync.test.ts` → **PASS**
- **Deadlock prevention sorting (process_sale)** → items sorted by `product_id ASC NULLS LAST` → Simulated in `inventory-sync.test.ts` → **PASS**
- **Deadlock prevention sorting (recipes)** → recipe items sorted by `r.inventory_item_id ASC` → Simulated in `inventory-sync.test.ts` → **PASS**
- **Calculated ml deduction using exact database formula** → `1.0 * 4 * 1.5 * 29.57 * 2 = 354.84 ml` → Simulated in `inventory-sync.test.ts` → **PASS**

---

## Unchallenged Areas

- **IndexedDB persistence capacity & durability** — reason not challenged: The mock environment tests in-memory behavior; local client SQLite/IndexedDB storage constraints are out of scope for the database level locking review.

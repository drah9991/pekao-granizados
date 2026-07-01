# POS Inventory Discount & Realtime Sync Review Report

## Review Summary

**Verdict**: REQUEST_CHANGES

This review evaluates the changes made across migrations, POS sale hooks, offline synchronization queue, and the service worker. While the database transaction deadlock prevention sorting is excellent and the replica identity optimizations are correct, there are critical functional gaps and vulnerability patterns that must be resolved.

---

## Quality Review Findings

### [Critical] Finding 1: Disconnected Recipe Model Mismatch
- **What**: The new `RecipeBuilder` component reads and updates the JSONB `recipe` column of the `products` table. However, the database transaction RPCs (`process_sale`, `update_order_with_stock`, `cancel_sale_with_stock_restore`) and the front-end POS grid (`ProductGrid.tsx`) fetch and operate on ingredients defined in the `public.recipes` relational table.
- **Where**: `src/components/inventory/RecipeBuilder.tsx:31` & `55`
- **Why**: Any recipe changes configured or edited via the `/inventory/recipes` screen will have absolutely no effect on actual inventory deductions, tank volume calculations, or POS stock validation, because the database RPCs do not query `products.recipe` JSONB.
- **Suggestion**: Refactor `RecipeBuilder` to read and write directly to the `public.recipes` table (modeled like `RecipeManagement.tsx`), or establish a PostgreSQL trigger on `public.products` to sync `recipe` JSONB changes into the `public.recipes` table automatically.

### [Major] Finding 2: ESLint Linter Failures in Target Files
- **What**: The linter fails on multiple target files due to explicit `any` usage and missing hook dependencies.
- **Where**: 
  - `src/hooks/usePOS.ts` (lines 29, 54, 76)
  - `src/lib/OfflineService.ts` (line 89)
  - `src/sw.ts` (lines 40, 97, 129)
- **Why**: Breaking codebase-wide TypeScript guidelines and hook safety rules.
- **Suggestion**:
  - Replace `any` with specific types (e.g. `unknown`, or `ExtendableEvent` / `SyncEvent` types in the Service Worker).
  - Add missing dependencies (like `handleSync`, `notifyInfo`, `notifyWarning`) to the `useEffect` dependency arrays or memoize/wrap them appropriately.

---

## Verified Claims

- **Deadlock prevention sorting in RPCs** → verified via reading SQL migrations & simulating in test suite → **PASS**
  - Database functions sort items by `product_id` and recipe items by `inventory_item_id` before locking. This prevents concurrent sale deadlocks.
- **Replica identity FULL on `inventory_items` and `machine_tanks`** → verified via migration check and realtime subscription testing → **PASS**
  - Required to support Supabase Realtime filtering by `store_id` on `UPDATE` events.
- **Bun automated test suite execution** → verified via running `bun test` in terminal → **PASS**
  - All 233 tests across 11 files executed and passed successfully.

---

## Coverage Gaps & Risk Assessment

- **Recipe schema discrepancy** — Risk level: **HIGH** — The application contains two completely different database patterns for storing product recipes (relational table vs. JSONB column on products). The new UI updates the wrong one.
- **Unverified items**: Real-time sync performance under high packet loss or database stress (row lock timeouts) — Risk level: **MEDIUM**.

---

## Adversarial Challenge Report

### [Critical] Challenge 1: Silent Pruning of Pending Sales on Expired Auth Sessions
- **Assumption challenged**: Offline queue sync failures in the Service Worker are either network errors (retryable) or permanent schema/validation errors (non-retryable).
- **Attack scenario**: A user makes a sale while offline. The device stays offline until the Supabase JWT expires (usually 1 hour). When internet is restored, the Service Worker's background sync wakes up. The fetch request to `/rest/v1/rpc/process_sale` returns `401 Unauthorized` or `403 Forbidden`. Because `401` is in the `[400, 500)` status range, the Service Worker classifies it as a permanent client validation error and splices/prunes it from the queue.
- **Blast radius**: The sale is permanently deleted from the queue without ever being synced to the server, resulting in lost revenue records.
- **Mitigation**: Do not prune status codes `401`, `403`, or `429` in the Service Worker. Keep them in the queue and trigger a sync retry once the user opens the app and re-authenticates.

### [High] Challenge 2: Out-of-Sync Recipe Definitions
- **Assumption challenged**: Modifying a product recipe in the UI alters the operational POS recipe.
- **Attack scenario**: Admin modifies a granizado recipe to consume `6ml` of syrup instead of `4ml`. The POS still deducts `4ml` because it uses the relational `recipes` table, while the builder modified the JSONB field.
- **Blast radius**: Discrepancy between system inventory and physical stock.
- **Mitigation**: Unify all editors to use the `public.recipes` table.

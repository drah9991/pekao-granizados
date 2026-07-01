# Handoff Report

## 1. Observation
- **Test Execution**: The command `bun test src/lib/inventory-sync.test.ts` ran successfully and all 8 tests passed:
  ```
  bun test v1.3.14 (0d9b296a)
  src\lib\inventory-sync.test.ts:
  (pass) Inventory Real-time Sync Tests > 1. Unit Sale Inventory Deduction > should correctly calculate optimistic product stock decrement [1.02ms]
  ...
  Ran 8 tests across 1 file. [86.00ms]
  8 pass
  0 fail
  ```
- **Lint Check**: The command `npm run lint` failed with exit code 1. Verbatim output snippet shows:
  ```
  src/hooks/usePOS.ts
    29:32  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    54:6   warning  React Hook useEffect has a missing dependency: 'handleSync'. Either include it or remove the dependency array  react-hooks/exhaustive-deps
  src/lib/OfflineService.ts
    89:34  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  src/sw.ts
    40:39  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
    97:54  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any
  ```
- **Recipe Mismatch**: `src/components/inventory/RecipeBuilder.tsx` fetches and updates the JSONB `recipe` column on the `products` table:
  ```typescript
  // Line 31
  .select('id, name, recipe')
  // Line 55
  .update({ recipe })
  ```
  Whereas the client-side POS grid `src/components/pos/ProductGrid.tsx` and the transactional database functions query the `recipes` table relation:
  ```typescript
  // ProductGrid.tsx Line 259
  recipes (
    inventory_item_id,
    quantity_required,
    ...
  )
  ```
- **Service Worker Pruning**: In `src/sw.ts` line 105, fetch failures in the `[400, 500)` range are treated as non-retryable and are spliced from the queue:
  ```typescript
  if (response.status >= 400 && response.status < 500) {
    const index = remainingQueue.findIndex((o: any) => o.id === order.id);
    if (index > -1) {
      remainingQueue.splice(index, 1);
    }
    successCount++;
  }
  ```

## 2. Logic Chain
- **Recipe Sync Issue**: Because `RecipeBuilder` writes updates to the JSONB `recipe` column of the `products` table, but the operational POS and database RPCs use the `public.recipes` relational table, any recipe changes made using `/inventory/recipes` will have no impact on actual POS transactions or tank deduction math.
- **Lint Issues**: The presence of explicit `any` and missing React hook dependencies violates typescript-eslint and react-hooks rules.
- **Silent Pruning Vulnerability**: If a user logs in, goes offline, makes a sale, and the device stays offline until the JWT token expires (returning HTTP 401 on reconnect), the Service Worker will classify the 401 Unauthorized (which is in the `[400, 500)` range) as a permanent client failure and prune it. This results in the silent loss of pending offline sales.

## 3. Caveats
- No caveats. The issues identified are direct functional mismatches in the codebase layout and database model patterns.

## 4. Conclusion
- The verdict is **REQUEST_CHANGES**. The implementation requires aligning the recipe editor (`RecipeBuilder.tsx`) to the `public.recipes` table model, addressing typescript-eslint linter errors, and refining the Service Worker's non-retryable error classification to avoid silent data loss on auth failures (e.g. keeping 401/403/429 in the queue).

## 5. Verification Method
- Execute `bun test src/lib/inventory-sync.test.ts` to verify unit test correctness.
- Execute `npx eslint src/hooks/usePOS.ts src/lib/OfflineService.ts src/sw.ts` to confirm lint problems are resolved.
- Log in, make an offline sale, simulate an expired token (by mocking a 401 response from the server), reconnect the internet, and verify that the sync queue does not prune the sale.

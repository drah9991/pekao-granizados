## 2026-06-30T15:56:54Z
You are a teamwork_preview_worker agent.
Your working directory is: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\worker_sync_2

Your mission is to resolve the findings and request changes from Reviewer 1:

1. **Database Migration**:
   - Create a new migration file `supabase/migrations/20260630000001_sync_product_recipe_trigger.sql` that defines a trigger function `public.sync_product_recipe_to_relational_recipes()` and a trigger `trg_sync_product_recipe` on `public.products` (AFTER INSERT OR UPDATE OF recipe).
   - This trigger must:
     - Delete any row in `public.recipes` for the product where `inventory_item_id` is NOT in the new `recipe` JSONB array.
     - For each element in the `recipe` JSONB array (which contains `{ inventory_item_id, quantity }`), perform an INSERT ... ON CONFLICT (product_id, inventory_item_id) DO UPDATE SET quantity_required = EXCLUDED.quantity_required.
     - Ensure the trigger has SECURITY DEFINER and search_path = public.

2. **Pruning of Auth Errors (401/403)**:
   - In `src/sw.ts` and `src/hooks/usePOS.ts` (in `handleSync` and `processSale` checks), ensure that `401 Unauthorized` and `403 Forbidden` responses/errors are NOT pruned from the sync queue.
   - ONLY prune validation errors (specifically HTTP `400 Bad Request` or `409 Conflict`, or PostgreSQL error codes `'P0001'` or starting with `'23'`). Keep token expiration/unauthorized errors in the queue and stop processing so they can be retried once the user logs back in.

3. **Linter Failures**:
   - Inspect and resolve all ESLint issues in:
     - `src/hooks/usePOS.ts`
     - `src/lib/OfflineService.ts`
     - `src/sw.ts`
     - `src/hooks/useSales.ts`
     - `src/hooks/useTankStatus.ts`
     - `src/lib/inventory-sync-utils.ts`
     - `src/lib/inventory-sync.test.ts`
     - `src/components/inventory/RecipeBuilder.tsx`
   - In particular, replace `any` with `unknown` or specific typed interfaces, and add any missing dependencies in `useEffect` hook dependency lists.

4. **Verify tests and lints**:
   - Run the Bun test suite: `bun test`
   - Run lint on target files: `npx eslint src/hooks/usePOS.ts src/lib/OfflineService.ts src/sw.ts src/hooks/useSales.ts src/hooks/useTankStatus.ts src/lib/inventory-sync-utils.ts src/components/inventory/RecipeBuilder.tsx`
   - Ensure everything is clean.

DO NOT CHEAT. All implementations must be genuine. Integrity violations WILL be detected and rejected.
Write your updates and logs in your `progress.md` file, and report completion with a message when done.

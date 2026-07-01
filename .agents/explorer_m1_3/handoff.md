# Handoff Report — Realtime UI Sync & Bun Testing Setup Audit

## 1. Observation
We observed the following files and details in the codebase:
- **`src/components/pos/TankLevelIndicator.tsx` (lines 19-35, 149-151)**: Renders tank levels using `useTankStatus`.
  ```typescript
  export function TankLevelIndicator({ name, current, max, percentage }: TankLevelIndicatorProps) {
    const isCritical = percentage < 15;
    const isWarning = percentage >= 15 && percentage <= 40;
  ...
  const { data: tanks, isLoading: isLoadingTanks } = useTankStatus(activeStoreId);
  ```
- **`src/hooks/useTankStatus.ts` (lines 75-97)**: Subscribes to `machine_tanks` table postgres changes:
  ```typescript
  const tanksChannel = supabase
    .channel(`machine-tanks-sync-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'machine_tanks',
        filter: `store_id=eq.${storeId}`
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['tank-status'] });
      }
    )
    .subscribe();
  ```
- **`src/components/pos/ProductGrid.tsx` (lines 248-289)**: Performs polling but has no direct realtime channel subscription.
  ```typescript
    const { data: gridData, isLoading: queryLoading } = useQuery({
      queryKey: ['products-grid', storeId],
      queryFn: async () => { ... },
      enabled: !!storeId,
      refetchInterval: 60000,
      staleTime: 30_000,
    });
  ```
- **`src/hooks/useProducts.ts` (lines 101-117)**: Subscribes to `products` changes (invalidating `products-grid`) but its `store_stock` listener only invalidates `products-admin`.
  ```typescript
      const channel = supabase.channel(`products-sync-${storeId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${storeId}` }, () => {
          queryClient.invalidateQueries({ queryKey: ["products-admin"] });
          queryClient.invalidateQueries({ queryKey: ["products-grid"] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'store_stock', filter: `store_id=eq.${storeId}` }, () => {
          queryClient.invalidateQueries({ queryKey: ["products-admin"] });
        })
  ```
- **`package.json` (line 13)**: The test command is mapped to Bun:
  ```json
  "test": "bun test"
  ```
- Running the command `bun test src/lib/csv-utils.test.ts` and `bun test src/lib/pricing.test.ts` completed successfully:
  ```
  Ran 43 tests across 1 file. [60.00ms]
  ```

---

## 2. Logic Chain
1. **Realtime Tank Updates**:
   - `TankLevelsList` invokes `useTankStatus(activeStoreId)`.
   - `useTankStatus` establishes a Supabase Realtime channel `machine-tanks-sync-${storeId}` monitoring `machine_tanks` table updates.
   - Any modification to database tank volumes invalidates query `['tank-status']`, forcing visual update.
   - Therefore, tank volumes are kept in realtime sync.
2. **Product Stock Sync**:
   - `ProductGrid` fetches data via `['products-grid', storeId]`. It has `refetchInterval: 60000` but no local realtime listener.
   - While `useProducts.ts` invalidates `products-grid` on product changes, it does not invalidate it when `store_stock` changes.
   - Thus, changes made to `store_stock` on remote POS registers will not sync in realtime on this register until the 60-second poll triggers.
3. **Optimistic Updates**:
   - `usePOS.ts` performs inline client-side updates on `tank-status` queries, mimicking the recipe volume deductions.
   - Factoring this calculation logic into a pure utility `calculateOptimisticTanks` allows clean unit testing without browser dependencies.
4. **Bun Testing**:
   - The test script `"test": "bun test"` executes built-in Bun runner.
   - Testing dependencies are resolved natively via Bun.

---

## 3. Caveats
- Realtime Supabase Sync policies and database replication lag were not examined.
- The analysis assumes that IndexedDB mock storage behavior in unit tests behaves identically to browser IndexedDB wrapper `idb`.

---

## 4. Conclusion
- The POS displays tank levels correctly in realtime through `vw_tank_percentages` invalidation, but has a stock level sync gap for `store_stock` on the main Product Grid due to missing channel invalidation triggers.
- The proposed test suite `src/lib/inventory-sync.test.ts` tests client-side optimistic tank level deduction logic and Zustand offline sync queue addition and removal.
- Separation of inline calculations in `usePOS.ts` into a utility makes the codebase modular and testable.

---

## 5. Verification Method
- Execute the Bun testing command:
  ```powershell
  bun test src/lib/csv-utils.test.ts
  ```
- Verify the test proposal code in `analysis.md` (which includes mock state, payload assertions, and optimistic calculations).

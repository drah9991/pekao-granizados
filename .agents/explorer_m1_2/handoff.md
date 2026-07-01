# Handoff Report: Client-Side POS Logic Audit

## 1. Observation
We observed the following code behavior in the client-side files:

- **Fire-and-Forget Sale Logic:** In `src/hooks/usePOS.ts` lines 221-252, the Supabase RPC call is wrapped in an asynchronous immediately invoked function expression (IIFE), which executes in the background. The parent function `processSale` immediately returns `orderData` on line 257 without waiting for the database response:
  ```typescript
  // Procesamiento asíncrono en segundo plano (Optimistic UI Fire-and-Forget)
  (async () => {
    try {
      if (isOnline) {
        const { error: rpcError } = await supabaseRpc<string>('process_sale', {
          sale_data: salePayload as Record<string, unknown>
        });
        if (rpcError) throw rpcError;
        ...
  ```
- **Error Swallowing to Sync Queue:** In `src/hooks/usePOS.ts` lines 239-251, any error thrown from the RPC call (regardless of whether it is a network error or a business validation failure like out of stock) is caught and pushed into the local offline sync queue:
  ```typescript
  } catch (error: unknown) {
    console.error("Error background processing sale:", error);
    Sentry.captureException(error);
    
    // Fallback silencioso: encolar localmente
    try {
      useSyncStore.getState().addToQueue(salePayload);
      registerBackgroundSync();
      notifyWarning("Red inestable: Venta guardada offline para reintento automático.");
    ...
  ```
- **Asymmetric Optimistic Updates:** In `src/hooks/usePOS.ts` lines 174-218, `processSale` performs optimistic cache updates ONLY on the `tank-status` query:
  ```typescript
  // Optimistic update for machine tanks
  try {
    const cachedGrid = queryClient.getQueryData(['products-grid', storeId]) as Record<string, unknown> | undefined;
    if (cachedGrid?.products) {
      const queryCache = queryClient.getQueryCache();
      const tankQueries = queryCache.findAll({ queryKey: ['tank-status', storeId] });
      tankQueries.forEach((q) => {
        const queryKey = q.queryKey;
        queryClient.setQueryData(queryKey, (oldTanks: unknown) => {
          ...
  ```
  No corresponding optimistic update is applied to `products-grid` for unit products.
- **Service Worker Background Sync Stuck Queue:** In `src/sw.ts` lines 96-105, if a queued order fails to sync with the database, it logs the error but does not remove it from the queue:
  ```typescript
  if (response.ok) {
    const index = remainingQueue.findIndex((o: any) => o.id === order.id);
    if (index > -1) {
      remainingQueue.splice(index, 1);
    }
    successCount++;
  } else {
    const errText = await response.text();
    console.error(`[SW] Order sync failed for order ${order.id}:`, errText);
  }
  ```
- **Missing Invalidation on Cancellation:** In `src/hooks/useSales.ts` lines 352-368, when a sale is cancelled via the `cancel_sale_with_stock_restore` RPC, the client only invalidates the `dashboard-stats` query and refreshes the order list:
  ```typescript
  const handleConfirmCancelWithReason = async (order: OrderWithDetails, reason: string) => {
    try {
      const { error } = await supabase.rpc('cancel_sale_with_stock_restore', {
        p_order_id: order.id,
        p_reason: reason
      });
      if (error) throw error;
      toast.success("Venta cancelada y stock restaurado correctamente");
      setIsCancelOpen(false);
      setSelectedOrder(null);
      fetchOrders();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: unknown) {
  ```
  Neither `products-grid` nor `tank-status` queries are invalidated.
- **Offline Tank Level UI Failure:** In `src/hooks/useTankStatus.ts` lines 52-55, when the fetch fails (such as when offline), the hook returns `[]`:
  ```typescript
  } catch (err) {
    console.error("[useTankStatus Hook] Error fetching tank status:", err);
    return [];
  }
  ```
  And in `src/components/pos/TankLevelIndicator.tsx` lines 212-224, returning an empty list displays a configuration error:
  ```typescript
  if (!tanks || tanks.length === 0) {
    return (
      ...
      <p className="text-[10px] text-muted-foreground/60 leading-normal font-medium font-dm-sans">
        No hay tanques configurados para esta sucursal.
      </p>
  ```

---

## 2. Logic Chain
1. **Fire-and-Forget + Silent Swallowing** means that a cashier will always receive a "sale success" message even if the database has rejected it because of a constraint like stock shortage.
2. **Asymmetric Optimistic Updates** causes a delay in updating unit-product stock (which is only updated when the background RPC finishes). During this window, another sale of the same unit product can be initiated.
3. This creates a **Race Condition** where two cashiers can sell the same final unit product. The second sale will fail at the database level.
4. When the second sale fails, it is **silent-swallowed into the offline sync queue**.
5. Once in the queue, the **Service Worker Sync Stuck Queue** behavior prevents the failed order from ever being removed because it returns a non-2xx response. Thus, it remains stuck, retrying indefinitely and bloating IndexedDB.
6. When an order is **cancelled**, the stock is restored in the database, but since **no invalidation is run for POS queries**, the client continues to display the old lower stock levels on the screen.
7. Going offline breaks the tank monitoring widget completely, showing a configuration error because there is **no offline cache for tank status**.

---

## 3. Caveats
- We did not audit the database-level RLS policies, indexes, or the exact SQL implementation of the `process_sale` and `cancel_sale_with_stock_restore` RPCs. We assume their database execution behaves as documented.
- We did not investigate how the Service Worker handles push notifications or other event synchronization beyond the `sync-orders` background sync event.

---

## 4. Conclusion
The client-side POS logic has critical flaws in error management, caching, and cache invalidation. Specifically:
- Database business validation failures are incorrectly categorized as network drops, leading to clogged offline queues.
- Stale stock values are displayed because unit-stock optimistic updates are missing, and no inventory invalidation occurs upon order cancellation.
- Offline tank monitoring lacks local persistence, leading to UI breakdown under poor connectivity.

---

## 5. Verification Method
To verify these behaviors:
1. **Cancellation Invalidation:** Inspect `src/hooks/useSales.ts`'s `handleConfirmCancelWithReason` method to verify that `queryClient.invalidateQueries` is called only for `["dashboard-stats"]` and not for `["products-grid"]` or `["tank-status"]`.
2. **Race Condition & Swallowing:** Inspect `src/hooks/usePOS.ts`'s `processSale` method to verify that the RPC invocation runs in an unawaited asynchronous IIFE, and its `catch` block unconditionally enqueues the payload.
3. **SW Queue Clogging:** Inspect `src/sw.ts`'s `syncOrders` method to verify that orders are only removed from the queue when `response.ok` is true, and any 400 or 500 error from the server keeps the order in `remainingQueue` indefinitely.

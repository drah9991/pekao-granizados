# Adversarial Review: POS Sync & Realtime Channel Bindings

## Challenge Summary

**Overall risk assessment**: MEDIUM

- **IndexedDB Sync Queue**: **LOW RISK**. The sync queue logic both in the client-side (`usePOS.ts` `handleSync`) and in the Service Worker (`sw.ts` `syncOrders`) correctly filters and removes permanent validation errors (4xx status codes, stock/RLS errors) while keeping transient network errors (Failed to fetch) in the queue. This prevents queue blocking. We have verified this via automated mock tests in `src/lib/sync-adversarial.test.ts`.
- **Supabase Realtime Subscriptions**: **MEDIUM RISK**. We identified two significant issues:
  1. A direct resource leak in `useNotifications.ts` where the return function of the subscription helper is discarded.
  2. Potential channel collision and premature unsubscription in hooks sharing named channels (like `usePOS.ts` and others) during rapid page navigation or multi-component mounting.

---

## Challenges

### [Medium] Challenge 1: Channel Collision and Premature Unsubscription on Concurrent/Overlapping Mounts

- **Assumption challenged**: Calling `supabase.channel("pos-realtime-sync-" + storeId)` creates an isolated channel instance that is safely closed upon component unmount without affecting other active components.
- **Attack scenario**:
  1. Component A (e.g., POS main grid) mounts, calling `usePOS()`, and subscribes to channel `pos-realtime-sync-${storeId}`.
  2. Component B (e.g., another page or modal like Print Center) mounts, calling `usePOS()`, and subscribes to the same named channel.
  3. React/Supabase JS client returns the cached channel instance with the same name.
  4. The user navigates away from POS main grid, causing Component A to unmount.
  5. Component A's cleanup function executes `supabase.removeChannel(channel)`.
  6. This closes the websocket channel connection entirely. As a result, Component B (Print Center) is silently left without any real-time Postgres changes.
- **Blast radius**: Medium. Real-time updates silently stop updating in the UI until the page is refreshed or `storeId` is changed.
- **Mitigation**: Append a unique identifier (like a random string or instance ID) to the channel name:
  ```typescript
  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []);
  const channel = supabase.channel(`pos-realtime-sync-${storeId}-${instanceId}`)
  ```
  This guarantees that overlapping component mounts register distinct channels, preventing the cleanup of one from breaking the subscription of another.

---

### [Medium] Challenge 2: Resource and Memory Leak in `useNotifications.ts`

- **Assumption challenged**: The realtime channel subscription in `useNotifications.ts` is cleaned up correctly when the component unmounts.
- **Attack scenario**:
  1. The user mounts a component using `useNotifications`.
  2. The hook registers a postgres_changes listener via `subscribeToNotifications()`.
  3. The `useEffect` calls `subscribeToNotifications();` but discards its return value:
     ```typescript
     useEffect(() => {
         if (storeId) {
             fetchNotifications();
             subscribeToNotifications();
         }
         // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [storeId]);
     ```
  4. When `storeId` changes or the component unmounts, the cleanup function of `subscribeToNotifications` is never invoked.
  5. Multiple websocket channel subscriptions accumulate in the background. When an insert occurs, duplicate event handlers trigger duplicate toast alerts and state updates, degrading performance and causing connection growth.
- **Blast radius**: Medium. Client-side memory leaks, duplicate notifications, and redundant network sockets.
- **Mitigation**: Return the result of `subscribeToNotifications()` inside `useEffect`:
  ```typescript
  useEffect(() => {
      if (storeId) {
          fetchNotifications();
          return subscribeToNotifications();
      }
  }, [storeId]);
  ```

---

## Stress Test Results

We created a custom adversarial suite (`src/lib/sync-adversarial.test.ts`) to verify IndexedDB queue behavior under client-side validation errors versus network errors.

| Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|
| **usePOS handleSync with Validation Error** | Bad order is removed; subsequent successful orders are processed and removed. | Bad order is removed; 2 successful orders are synced. Queue is cleared. | **PASS** |
| **usePOS handleSync with Network Error** | Network error is caught. Item remains in queue; loop continues for other items (no break in usePOS). | Network error item remains in queue; other items are processed. | **PASS** |
| **sw.ts syncOrders with Validation Error** | Fetch fails with 409. Item is spliced from queue. Loop continues and updates IndexedDB. | 409 error order is removed from queue. Subsequent orders succeed. | **PASS** |
| **sw.ts syncOrders with Network Error** | Fetch throws. Loop breaks immediately. Orders remain in the queue to maintain ordering. | Loop breaks on network throw. Sync queue remains intact. | **PASS** |

---

## Unchallenged Areas

- **IndexedDB Schema Versioning**: Unchallenged because there were no database schema modifications requested in this run. We assume the current IndexedDB version (`2`) is stable.
- **Supabase RPC (`process_sale`) Internals**: Unchallenged because the database schema and RPC source codes are out of the scope of this sync queue verification task.

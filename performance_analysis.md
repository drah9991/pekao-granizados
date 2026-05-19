# Performance Analysis: `useCart` Data Fetching

## Current State
The `useCart` hook currently fetches several pieces of configuration data (sizes, toppings, product types, and pricing rules) using a manual `useEffect` and `useState` pattern.

### Issues Identified:
1. **Network Waterfall**: Data is fetched serially within an `async` function.
   - `fetchUserStoreIdAndData` (async) -> `fetchDynamicData` (async)
   - Inside `fetchDynamicData`, four `supabase` calls are executed one after another using `await`.
2. **Lack of Caching**: Since the data is stored in local component state (`useState`), it is lost when the component unmounts. Subsequent mounts trigger redundant network requests.
3. **Redundant Logic**: The hook manually fetches the `storeId` from the `profiles` table, which is already available in the `AuthContext`.
4. **Stale Data**: There's no built-in mechanism to refresh the data unless the component remounts or `fetchDynamicData` is manually called.

## Proposed Optimization
Refactor the data fetching to use `@tanstack/react-query`'s `useQuery` hook.

### Benefits:
1. **Parallel Fetching**: React Query will initiate all queries in parallel, eliminating the waterfall.
2. **Global Caching**: Data will be cached at the application level. Other components needing the same data (like `ProductGrid`) can share the cache.
3. **Stale-While-Revalidate**: Provides immediate cached data while background-refreshing if necessary.
4. **Simplified Code**: Removes manual state management and error handling for these data points.
5. **Reduced Latency**: High `staleTime` will ensure that most transitions within the app will have zero latency for this configuration data.

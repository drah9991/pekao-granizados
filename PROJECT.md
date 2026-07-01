# Project: Real-time POS Inventory Discount & Restoration

## Architecture
The application is a point-of-sale (POS) system for granizados (slushies) built using React, Tailwind CSS, TypeScript, and Supabase.
- **Frontend POS UI**: React components managing cart, sales processing, and inventory visualization (stock grids, machine tank levels).
- **Offline Synced Client Logic**: IndexedDB-based queue to handle sales in offline mode and sync them back to the server once online.
- **Backend Database**: Supabase (PostgreSQL) storing `store_stock`, `inventory_items`, `recipes`, `machine_tanks`, `sales`, and `sale_items`.
- **Atomic Operations**: Database RPCs (`process_sale` and sale cancellation/restoration) that deduct/restore stock and tank/recipe inventory using atomic transactions and row locks.
- **Realtime Sync**: Supabase Realtime channel subscriptions to update client state immediately upon database-level stock/tank changes.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Audit of Inventory Cycle | Conduct complete exploration of backend RPCs/triggers/migrations and frontend POS hooks/Realtime subscriptions. | None | DONE |
| 2 | Atomic DB & Client Logic | Implement/update database RPCs and triggers for sale & cancellation to atomically deduct/restore inventory (units and recipes) without race conditions. | M1 | IN_PROGRESS (9d182c46) |
| 3 | Real-time UI Subscriptions | Connect POS UI components (tanks, grids) to Supabase Realtime for instant updates on inventory/tank changes. | M2 | IN_PROGRESS (9d182c46) |
| 4 | Bun Automated Verification | Build and run a Bun automated test suite at `src/lib/inventory-sync.test.ts` to assert correct inventory behavior on sale, mixture, and cancellation. | M2, M3 | IN_PROGRESS (9d182c46) |

## Interface Contracts
### Client POS ↔ Supabase RPC `process_sale`
- Input: Sale data, including items, quantities, price, and store context.
- DB Logic: Atomic updates on `store_stock` (unit stock) and ingredients (`inventory_items`, `recipes`, `machine_tanks`).
- Output: Success status, created sale record, or error message (e.g., out of stock, concurrent edit lock).

### Client POS ↔ Supabase RPC `cancel_sale`
- Input: Sale ID.
- DB Logic: Restore `store_stock` and recipe-based levels in `machine_tanks` / `inventory_items`.
- Output: Success status or error.

### Client UI ↔ Realtime Subscriptions
- Channel: PostgreSQL changes on schema `public` tables: `store_stock`, `machine_tanks`, `inventory_items`.
- Frontend Handler: Sync states of tanks and product cards instantly on trigger.

## Code Layout
- `src/pages/POS.tsx` — Main POS interface
- `src/hooks/usePOS.ts` — POS sale logic & queue processing
- `src/lib/OfflineService.ts` — Offline synchronization queue
- `src/integrations/supabase/client.ts` — Supabase client instance
- `supabase/migrations/` — SQL migrations defining RPCs, triggers, tables
- `src/lib/inventory-sync.test.ts` — Automated test suite location

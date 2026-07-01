# BRIEFING — 2026-06-30T10:45:00-05:00

## Mission
Implement real-time inventory discount on POS sales and cancellations, and validate it via automated Bun tests.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\worker_sync
- Original parent: 9d182c46-c0fd-4dad-9818-0dd7ca632118
- Milestone: Realtime POS Inventory and Sync

## 🔒 Key Constraints
- Network: CODE_ONLY (no external HTTP clients, wget, curl, or external websites)
- No cheats, dummy/facade implementations, or hardcoding test results.
- Must verify everything.

## Current Parent
- Conversation ID: 9d182c46-c0fd-4dad-9818-0dd7ca632118
- Updated: yes

## Task Summary
- **What to build**: Real-time inventory sync & discount logic across DB migrations (process_sale, update_order_with_stock, cancel_sale_with_stock_restore, and check_inventory_stock_trigger), RecipeBuilder fixes, OfflineService caching for tanks, useTankStatus caching, usePOS optimistic updates & offline queue error handling & realtime table listeners, sw.ts error handling, useSales cancellation invalidation, and a Bun test suite verifying all behaviors.
- **Success criteria**: All automated Bun tests pass, code compiles and lints clean, and inventory updates are synced instantly.
- **Interface contracts**: CLAUDE.md, AGENTS.md, and database schema functions.
- **Code layout**: src/ for frontend, supabase/migrations/ for migrations, and src/lib/*.test.ts for tests.

## Change Tracker
- **Files modified**:
  - `supabase/migrations/20260630000000_inventory_realtime_sync.sql` — SQL migration updating process_sale, update_order_with_stock, cancel_sale_with_stock_restore, check_inventory_stock_trigger, and indexes.
  - `src/components/inventory/RecipeBuilder.tsx` — Updated inventory query and code to select and display 'unit' instead of 'unit_of_measure'.
  - `src/lib/OfflineService.ts` — Added saveTanks and getTanks methods for IndexedDB caching.
  - `src/hooks/useTankStatus.ts` — Cached tank statuses locally on query success, and restored cached tanks on failure.
  - `src/lib/inventory-sync-utils.ts` — Extracted pure optimistic update functions for product stocks and tank levels.
  - `src/hooks/usePOS.ts` — Applied new optimistic update helpers, awaited online RPC directly, handled validation vs network errors, and subscribed to PG changes for realtime updates.
  - `src/sw.ts` — Pruned non-retryable 4xx client errors from background sync queue.
  - `src/hooks/useSales.ts` — Invalidated products-grid and tank-status query caches on sale cancellation.
  - `src/lib/inventory-sync.test.ts` — Added unit/mixture deduction, cancellation restore, and sync error handling tests.
- **Build status**: pass (all 188 tests pass successfully)
- **Pending issues**: None

## Quality Status
- **Build/test result**: pass (188 tests passed, 0 failed)
- **Lint status**: TBD (running eslint via background task)
- **Tests added/modified**: `src/lib/inventory-sync.test.ts` (8 test cases added)

## Loaded Skills
- None

## Key Decisions Made
- Used conversion factors in client-side optimistic deductions matching the exact SQL functions logic (e.g. 29.57 converter for ounces to ml).

## Artifact Index
- c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\worker_sync\ORIGINAL_REQUEST.md — Initial user request details.

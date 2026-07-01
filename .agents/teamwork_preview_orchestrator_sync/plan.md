# Execution Plan - Real-time POS Inventory Discount & Restoration

## Step 1: Audit and Analysis (Milestone 1)
- **Goal**: Formulate a complete understanding of how stock discounts and restorations are currently structured in the codebase.
- **Tasks**:
  - Scan the repository for Supabase migrations and database schema dumps (specifically `supabase_full_schema.sql` and files in `supabase/migrations/`).
  - Search for references to `store_stock`, `machine_tanks`, `inventory_items`, `recipes`, and `process_sale`.
  - Analyze `src/hooks/usePOS.ts` and `src/lib/OfflineService.ts` to understand how sales are processed client-side and synchronized.
  - Check how the POS visualizes stock levels and machine tanks (`src/pages/POS.tsx` or related components).
  - Draft an Audit Report identifying what logic is missing or broken.
- **Verification**: Handoff from Explorer detailing database structure, current implementation details, and recommended changes.

## Step 2: Implement Atomic Database & Client Logic (Milestone 2)
- **Goal**: Implement bulletproof, atomic database and client-side transaction flows for sales and cancellations, avoiding any race conditions.
- **Tasks**:
  - Implement a migration containing/updating database RPCs (e.g., `process_sale`, `cancel_sale`) or triggers to:
    - Lock rows with `FOR UPDATE` where necessary to avoid concurrency/race issues.
    - Check stock/tank limits before permitting the sale.
    - Deduct unit product stock (`store_stock`).
    - Deduct recipe-based quantities (`machine_tanks` volume and `inventory_items` if applicable).
    - Handle cancellation and restore exact quantities/volumes to `store_stock`, `machine_tanks`, etc.
  - Update frontend client code (e.g. `usePOS.ts` or related hooks) to invoke these atomic operations correctly.
- **Verification**: Worker reports build passes and test-run (locally) shows DB updates behave correctly.

## Step 3: Implement Real-time UI Subscriptions (Milestone 3)
- **Goal**: Ensure the UI displays tank levels and stock grids immediately without reloading, using Supabase Realtime.
- **Tasks**:
  - Locate tank indicators and stock grid components in the POS UI.
  - Subscribe to Supabase Postgres changes on `store_stock` and `machine_tanks` tables inside the POS hook or component.
  - Trigger updates to the local component state or query cache upon receiving Realtime events.
- **Verification**: Verify that client components receive Realtime payloads and update UI state.

## Step 4: Bun Automated Verification (Milestone 4)
- **Goal**: Build an E2E and unit test suite that asserts correctness of inventory changes under multiple scenarios.
- **Tasks**:
  - Create `src/lib/inventory-sync.test.ts`.
  - The test suite must use `bun:test` and test:
    1. Single unit sale & deduction verification.
    2. Recipe-based sale, verifying exact volume deduction in `machine_tanks`.
    3. Cancellation of both sale types, verifying exact restoration.
  - Run the test suite and confirm that all tests pass.
- **Verification**: Run `bun test src/lib/inventory-sync.test.ts` and ensure all tests are green.

# BRIEFING — 2026-06-30T10:55:00-05:00

## Mission
Review the inventory discount and realtime sync changes, verify tests run successfully, and perform quality/adversarial review.

## 🔒 My Identity
- Archetype: reviewer_critic
- Roles: reviewer, critic
- Working directory: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\reviewer_sync_1
- Original parent: 27991844-6c01-483c-80dc-ee2e88d8e774
- Milestone: Inventory Discount and Realtime Sync Review
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code

## Current Parent
- Conversation ID: 27991844-6c01-483c-80dc-ee2e88d8e774
- Updated: not yet

## Review Scope
- **Files to review**:
  - `supabase/migrations/20260630000000_inventory_realtime_sync.sql`
  - `supabase/migrations/20260630000000_fix_realtime_replica_identity.sql`
  - `src/components/inventory/RecipeBuilder.tsx`
  - `src/lib/OfflineService.ts`
  - `src/hooks/useTankStatus.ts`
  - `src/lib/inventory-sync-utils.ts`
  - `src/hooks/usePOS.ts`
  - `src/sw.ts`
  - `src/hooks/useSales.ts`
  - `src/lib/inventory-sync.test.ts`
- **Interface contracts**: `PROJECT.md` / `SCOPE.md`
- **Review criteria**: correctness, completeness, robustness, style, and lint correctness.

## Key Decisions Made
- Performed full repository lint and targeted file inspection
- Ran test suite using Bun (`bun test`)
- Determined that changes require refactoring and issued a REQUEST_CHANGES verdict

## Artifact Index
- `.agents/reviewer_sync_1/BRIEFING.md` — Active briefing file
- `.agents/reviewer_sync_1/progress.md` — Progress tracker and heartbeat
- `.agents/reviewer_sync_1/ORIGINAL_REQUEST.md` — Copy of original dispatcher prompt
- `.agents/reviewer_sync_1/review.md` — Quality and Adversarial review findings
- `.agents/reviewer_sync_1/handoff.md` — Five-component handoff report

## Review Checklist
- **Items reviewed**: All 10 files in scope
- **Verdict**: REQUEST_CHANGES
- **Unverified claims**: None (all checked and tested)

## Attack Surface
- **Hypotheses tested**: 
  - Expired JWT token handling in background sync: verified it triggers status 401 which gets pruned from the queue, causing permanent data loss
  - Recipe configuration updates: verified they update `products.recipe` JSONB but are completely ignored by transactional RPCs querying `public.recipes` table
- **Vulnerabilities found**: 
  - Silent queue pruning on auth failures (HTTP 401/403) in `src/sw.ts`
  - Broken recipe editor mapping mismatch in `RecipeBuilder.tsx`
- **Untested angles**: Extreme network latency behavior

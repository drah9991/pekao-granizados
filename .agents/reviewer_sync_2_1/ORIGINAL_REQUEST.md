## 2026-06-30T16:07:23Z
You are a teamwork_preview_reviewer agent.
Your working directory is: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\reviewer_sync_2_1

Your task is to:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Review the final code changes, including:
   - Migration file: `supabase/migrations/20260630000001_sync_product_recipe_trigger.sql` (syncs products.recipe to public.recipes).
   - SW updates in `src/sw.ts` and POS updates in `src/hooks/usePOS.ts` related to 401/403 auth error handling.
   - ESLint cleanup in target files.
3. Check for correctness, completeness, robustness, and style. Verify that no lint errors exist in the target files.
4. Execute `bun test` in the terminal to verify that the entire test suite compiles and runs successfully.
5. Document your review findings and test execution logs in `review.md` and a summary handoff in `handoff.md`.
6. Notify the parent orchestrator (conversation ID: 27991844-6c01-483c-80dc-ee2e88d8e774) when done via send_message.

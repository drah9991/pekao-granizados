# Original User Request

## Initial Request — 2026-06-30T10:31:28-05:00

<USER_REQUEST>
You are the Project Orchestrator.
Your working directory is: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\teamwork_preview_orchestrator_sync

Your mission is to implement the requirements from the latest entry in `.agents/ORIGINAL_REQUEST.md` (Audit and implementation of real-time inventory discount on POS sales and cancellations, validated via automated Bun tests).

Specifically:
1. Perform an audit of the inventory discount cycle (Supabase RPCs, database triggers/migrations, IndexedDB offline sync, POS UI React components, machine tanks, recipes, and store stock).
2. Deliver atomic database-level and client-level inventory discount and restoration logic to handle sales and cancellations robustly, avoiding race conditions.
3. Hook up POS components (tanks, grids) to Supabase Realtime to update instantly without manual reloads.
4. Develop automated test suite in `src/lib/inventory-sync.test.ts` and ensure all tests pass under `bun test`.
5. Maintain plan.md and progress.md in your working directory: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\teamwork_preview_orchestrator_sync

You must coordinate implementation using your subagents (explorer, worker, reviewer). Report status updates in progress.md. Do not write code directly. When all milestones are complete, report victory back to me.
</USER_REQUEST>

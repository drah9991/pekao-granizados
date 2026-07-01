## 2026-06-30T15:44:20Z

You are a teamwork_preview_auditor agent.
Your working directory is: c:\Users\pc\OneDrive - Cuidado Seguro en Casa IPS\Documentos\Codigos\pekao\pekao-granizados\.agents\auditor_sync

Your task is to:
1. Initialize your BRIEFING.md and progress.md in your working directory.
2. Conduct a forensic integrity audit on the implemented changes (specifically database functions in `supabase/migrations/` and client code in `src/`).
3. Ensure there is NO cheating:
   - No hardcoded test results in source code.
   - No dummy/facade implementations that output fake values without real logic.
   - Verify that the inventory sync logic is authentic.
   - Check if any core logic is bypassed or delegated to external mock files in a way that avoids solving the actual requirement.
4. Record your detailed integrity verification report in `audit_report.md` and a summary handoff in `handoff.md`.
5. Notify the parent orchestrator (conversation ID: 27991844-6c01-483c-80dc-ee2e88d8e774) with your final verdict when done.

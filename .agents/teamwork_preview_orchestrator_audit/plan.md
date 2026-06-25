# UI/UX Audit Plan

## Goal
Conduct a complete UI/UX audit of the system, focusing on responsive design, visual consistency, dark/light contrast, and accessibility. Provide a report named `ui_ux_audit_report.md` in the project root without modifying any code files.

## Steps
1. **Initialize Metadata**: Create `plan.md` and `progress.md` inside `.agents/teamwork_preview_orchestrator_audit/`. [done]
2. **Decompose and Analyze (Explorer Phase)**:
   - Dispatch `teamwork_preview_explorer` to inspect the main UI pages:
     - `src/pages/POS.tsx` (POS screen)
     - `src/pages/Dashboard.tsx` & dashboard widgets (Dashboard screen)
     - `src/pages/Inventory.tsx` & inventory widgets (Inventory screen)
     - `src/pages/CashRegister.tsx` & cash widgets (Cash Register screen)
     - `src/pages/Settings.tsx` & related configuration UI (Settings screen)
     - `src/components/Layout.tsx` & `src/components/alerts/` (General layout, sidebar, responsiveness, modals/alerts)
   - The Explorer will identify responsive issues (e.g., mobile overflow, overlapping elements, spacing), visual consistency issues, and dark/light mode contrasts.
3. **Draft Findings**:
   - The Explorer will write a comprehensive handoff report detailing specific issues, files, line numbers/sections, and step-by-step Tailwind class recommendations.
4. **Generate Report (Worker Phase)**:
   - Dispatch `teamwork_preview_worker` to write the final `ui_ux_audit_report.md` to the project root directory.
   - The report must analyze at least 5 views/components, with real file paths and concrete code diffs/ Tailwind suggestions, leaving code files untouched.
5. **Verify and Review**:
   - Dispatch `teamwork_preview_reviewer` / `teamwork_preview_auditor` to check the audit report for completeness, ensure no files were modified, and verify layout/responsive recommendations make sense.
6. **Handoff to Parent**: Communicate final status to the parent agent.

# Project: UI/UX Audit

## Architecture
This is a React + Vite + Tailwind CSS system, integrating with Supabase. The goal of the project is to audit the UI/UX components for visual consistency, responsiveness, accessibility, and color/spacing issues, especially in Light vs Dark modes.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Planning & Setup | Define scope and create plan.md, progress.md, BRIEFING.md, PROJECT.md | none | DONE |
| 2 | Explore & Analyze | Run Explorer subagents to scan files and list issues | M1 | DONE |
| 3 | Report Generation | Create the `ui_ux_audit_report.md` in the project root via Worker | M2 | DONE |
| 4 | Verification | Review files, ensure no code changes, and verify audit quality | M3 | DONE |

## Code Layout
- `src/pages/` - Application views (POS, Dashboard, Inventory, Settings, CashRegister)
- `src/components/` - Common and custom UI components (Sidebar, alerts, inputs)
- `src/index.css` - Custom styles, Tailwind base and theme variables
- `tailwind.config.ts` - Tailwind design token configuration

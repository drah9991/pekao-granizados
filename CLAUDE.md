# CLAUDE.md

This file provides guidance to any AI agent working on the **Pekao Granizados POS** repository.

## Project Overview
Pekao Granizados is a high-performance Point of Sale (POS) and Inventory system built with:
- **Frontend**: React 18 + TypeScript + Vite 5 + Tailwind 3 + shadcn/Radix + Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, RLS, Edge Functions)
- **State Management**: React Query (server state), Zustand (`src/store/`), React Context (`src/context/`)
- **Offline**: PWA (`src/sw.ts`, `vite-plugin-pwa`), `idb`, `src/lib/OfflineService.ts`
- **Mobile**: Expo customer app in `apps/mobile/` (has its own `AGENTS.md`)
- **Design Philosophy**: Premium, Dark Mode, Zero-scroll dashboard.

## Commands
- Dev: `npm run dev` (staging: `npm run dev:staging`)
- Build: `npm run build` (staging: `npm run build:staging`)
- Lint: `npm run lint`
- Unit tests: `npm test` (single run: `npx vitest --run`), coverage: `npm run test:coverage`
- E2E: `npm run test:e2e` (needs `TEST_EMAIL` / `TEST_PASSWORD`)
- Staging DB: `npm run staging:migrate | staging:rebuild | staging:test`

## Technical Standards
- **Immutability**: ALWAYS use spread operators, NEVER mutate state.
- **Database**: All schema changes MUST be in `supabase/migrations/`. Never change the schema from the dashboard.
- **Security**: EVERY table must have RLS enabled. Policy columns MUST be indexed.
- **Components**: Many small files > few large files. Max 400 lines per component.
- **Business logic in Postgres**: sales, stock and cancellations go through RPCs
  (`process_sale_with_stock`, `cancel_sale_restore_stock`, `get_digital_menu`). Call the RPC; do not
  replicate stock math in the client.
- **Testing**: Vitest + Testing Library; tests sit next to the code (`*.test.ts`) or in `__tests__/`.
  Coverage target is 80%, currently far below; add tests with every change.

## Project Structure
- `src/pages/`: one module per screen (POS, Dashboard, Inventory, CashRegister, Settings…)
- `src/components/<module>/`: domain components; `ui/` is shadcn (do not hand-edit)
- `src/hooks/`: one data hook per domain (`usePOS`, `useInventory`, `useSales`…)
- `src/lib/`, `src/utils/`: pricing, currency, inventory sync, rate limiting
- `src/config/navConfig.ts`: sidebar navigation; register new pages here and in `src/App.tsx`
- `supabase/functions/`: `delete-user`, `update-user`, `retention-cron`, `wompi-webhook`
- `api/`: serverless endpoints (`chat.ts`, `extract-menu.ts`)
- `scripts/`: staging migration and rebuild tooling
- `e2e/`: Playwright specs

## Conventions
- Commits: Conventional Commits in Spanish (`feat(db): …`, `fix(menu): …`).
- Files: hooks `useCamelCase.ts`, pages/components `PascalCase.tsx`.
- Current working branch is `staging`; `main` is production.
- Gotchas: `src/store/` and `src/stores/` both exist (prefer `src/store/`); migration timestamps must
  be unique. Never commit `.env*` files, only `*.example`.

## Available Resources
- **Agents** (`.agents/`):
  - `planner.md`: Use for complex feature planning.
  - `architect.md`: Use for system design decisions.
  - `database-reviewer.md`: Use for SQL and migration reviews.
- **Skills** (`.skills/`):
  - `frontend-patterns`: React/Tailwind best practices.
  - `backend-patterns`: API and database optimization.
  - `database-migrations`: Migration workflows.

## Development Workflow
1.  **Plan**: Use `/plan` or the `planner` agent.
2.  **Schema**: Create migration in `supabase/migrations/`.
3.  **Review**: Use `database-reviewer` for SQL.
4.  **Implement**: Follow `frontend-patterns`.
5.  **Verify**: Ensure RLS is active and types are strict; run `npm run lint` and `npm test`.

## Key Files
- `src/pages/POS.tsx`: Main sales interface.
- `src/pages/Dashboard.tsx`: Administrative overview.
- `src/pages/Inventory.tsx`: Stock management.
- `supabase/migrations/`: Database source of truth.

<!-- ASTRYX:START -->
Astryx v0.7.15 · 174 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.
Before you deliver a build, run `astryx doctor --built <dir>`; don't deliver it if it fails.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then Tailwind utilities backed by tokens. No raw hex/px.
- Palettes and custom colors go through the theme, never :root overrides. Run `astryx theme add <slug>` to import; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any style={{…}}, raw <div>/<span>, imported .css/@apply, or hardcoded/arbitrary value (bg-[#fff], p-[13px]) with the component or a token-backed utility.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->

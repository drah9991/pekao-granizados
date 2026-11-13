# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Existing guidance files
- `CLAUDE.md` exists and contains important implementation constraints (captured below).
- No existing `WARP.md` or `AGENTS.md` was present at the time this file was created.

## Core development commands

### Install and run
- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Production build: `npm run build`
- Development-mode build: `npm run build:dev`
- Preview production build locally: `npm run preview`
- Lint entire repo: `npm run lint`

### Targeted linting
- Lint a specific file: `npx eslint src/path/to/file.tsx`

### Tests (current state)
- There is **no** `npm test` script in `package.json`.
- The repository does contain at least one Bun test file (`src/lib/csv-utils.test.ts`) using `bun:test`.
- If Bun is installed, run all Bun tests: `bun test`
- If Bun is installed, run a single test file: `bun test src/lib/csv-utils.test.ts`

## Environment and services
- Frontend env is expected via `.env` (see `.env.example`).
- Supabase client is configured in `src/integrations/supabase/client.ts` and uses:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Optional Sentry DSN: `VITE_SENTRY_DSN` (Sentry initializes in `src/main.tsx` via `src/lib/sentry.ts`).

## High-level architecture

### App bootstrap and runtime shell
- `src/main.tsx` initializes:
  - PWA service worker registration (`virtual:pwa-register`)
  - Sentry
  - global unhandled rejection logging
- `src/App.tsx` is the composition root:
  - `QueryClientProvider` (TanStack Query)
  - `AuthProvider` and `TurnProvider`
  - theme + toasters + analytics
  - route-level lazy loading with `Suspense`
  - role-protected routes via `ProtectedRoute`

### Auth + role/store scoping
- `src/context/AuthContext.tsx` is the central auth/session source.
  - Uses Supabase Auth session listener.
  - Hydrates profile from `profiles` and role from `user_roles`.
  - Exposes `user`, `userRole`, and `storeId` used across feature hooks/pages.
- `src/components/ProtectedRoute.tsx` handles login and role checks.

### Navigation and feature surface
- `src/config/navConfig.ts` defines role-based navigation groups and items.
- `src/components/Layout.tsx` renders navigation from `navConfig`, enforces role visibility, and integrates realtime alert listeners.
- The app is organized around operational pages (`/pos`, `/dashboard`, `/inventory`, `/sales`, `/settings`, etc.) in `src/pages/` with most business logic in `src/hooks/`.

### Data access pattern
- Supabase access should go through `src/integrations/supabase/client.ts`.
- Typed DB schema is in `src/integrations/supabase/types.ts`.
- Server-state fetching is generally done with TanStack Query; `src/hooks/useSupabaseQuery.ts` provides standard defaults (SWR-like behavior).

### POS + inventory transaction flow (critical)
- POS UI: `src/pages/POS.tsx`.
- Sale orchestration: `src/hooks/usePOS.ts` (called by `usePOSPage`).
- Online sales call Supabase RPC `process_sale`; offline sales are queued in IndexedDB via `src/lib/OfflineService.ts` and synced later.
- Cash turn gating is enforced through `TurnContext` (`src/context/TurnContext.tsx`): POS operations require an active (non-paused) turn.

### Dual inventory model (important for backend changes)
Inventory behavior spans SQL migrations and frontend hooks:
- Unit/product stock uses `store_stock`.
- Mixture/recipe consumption uses `inventory_items` + `recipes`.
- `process_sale`, `update_order_with_stock`, and `cancel_sale_with_stock_restore` migrations implement stock deduction/restoration, role checks, and concurrency protections (`FOR UPDATE` in critical paths).
- Relevant migration history is in `supabase/migrations/` (notably files around `process_sale*`, inventory creation, mixture logic isolation, and security/race-condition fixes).

## Rules inherited from repository guidance
From `CLAUDE.md` and existing project rules:
- Keep state updates immutable (no in-place mutation).
- Put schema changes in `supabase/migrations/`.
- Ensure RLS is enabled for tables and keep policy-related columns indexed.
- Prefer many small components over very large ones (guidance target: max ~400 lines/component).
- Prefer existing stack conventions:
  - shadcn/ui components from `src/components/ui/`
  - Tailwind for styling
  - React Router routes in `src/App.tsx`
  - TanStack Query for server state
  - `lucide-react` icons
  - `sonner` for toast notifications

## Key files for fast orientation
- `src/main.tsx` — bootstrap (PWA + Sentry)
- `src/App.tsx` — provider stack and route map
- `src/context/AuthContext.tsx` — auth/profile/role/store context
- `src/context/TurnContext.tsx` — cash turn lifecycle + realtime sync
- `src/config/navConfig.ts` — role-to-navigation mapping
- `src/hooks/usePOS.ts` — sale processing and offline sync
- `src/lib/OfflineService.ts` — IndexedDB offline queue/cache
- `src/integrations/supabase/client.ts` — canonical Supabase client
- `supabase/migrations/` — source of truth for DB logic and RPC behavior

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

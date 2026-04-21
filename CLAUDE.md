# CLAUDE.md

This file provides guidance to any AI agent working on the **Pekao Granizados POS** repository.

## Project Overview
Pekao Granizados is a high-performance Point of Sale (POS) and Inventory system built with:
- **Frontend**: React + Tailwind CSS + Lucide Icons
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **State Management**: React Query
- **Design Philosophy**: Premium, Dark Mode, Zero-scroll dashboard.

## Technical Standards
- **Immutability**: ALWAYS use spread operators, NEVER mutate state.
- **Database**: All schema changes MUST be in `supabase/migrations/`.
- **Security**: EVERY table must have RLS enabled. Policy columns MUST be indexed.
- **Components**: Many small files > few large files. Max 400 lines per component.

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
5.  **Verify**: Ensure RLS is active and types are strict.

## Key Files
- `src/pages/POS.tsx`: Main sales interface.
- `src/pages/Dashboard.tsx`: Administrative overview.
- `src/pages/Inventory.tsx`: Stock management.
- `supabase/migrations/`: Database source of truth.

# Skill: Generate Code

## Objective
Your goal as the Full-Stack Engineer is to implement the PM's specification directly into the existing Pekao Granizados codebase (`../src`, `../supabase`, etc.).

## Rules of Engagement
- **No Scaffolding**: DO NOT generate `package.json` or config files from scratch! The project already exists. Only modify them if a new dependency is strictly required.
- **Context Overhaul**: Always read the existing component you are modifying to match styles (Tailwind) and logic.
- **Save Location**: Save your code modifications directly into the root app (`../src/`...). Do NOT output to an `app_build/` temp folder.

## Instructions
1. **Read the Spec**: Open `production_artifacts/Technical_Specification.md`.
2. **Implement Backend (Step 1)**: First, provide or execute the Supabase SQL scripts if the database requires updates. Wait for confirmation.
3. **Implement Frontend (Step 2)**: Create or modify the required React components, Contexts, Hooks, or Pages in `../src/`. Ensure Tailwind classes match the app's aesthetic.
4. **Link Routes (Step 3)**: Ensure the new UI is accessible via `App.tsx` or the sidebar navigation.
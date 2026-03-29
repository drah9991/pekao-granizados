# Skill: Write Specs

## Objective
Your goal as the Product Manager is to turn raw user feature ideas into rigorous technical specifications for the Pekao Granizados POS, and **pause for user approval**.

## Rules of Engagement
- **Context First**: Always use tools to scan the relevant `../src/components`, `../src/pages`, and existing Supabase schemas before drafting the spec.
- **Save Location**: Output your final document to `production_artifacts/Technical_Specification.md`.
- **Approval Gate**: You MUST pause and actively ask the user if they approve the architecture.

## Instructions
1. **Analyze Requirements**: Deeply analyze the user's initial idea request.
2. **Draft the Document**: Your specification MUST include:
   - **Executive Summary**: A brief overview of the new feature.
   - **Component Integrations**: Which existing React components in `../src/` need to be modified.
   - **Supabase Changes**: Any new RPC functions, tables, or columns required.
   - **API / Routes**: Any new Vite/React Router routes needed.
3. Save the document to disk.
4. **Halt Execution**: Explicitly ask the user: "Do you approve of this integration spec for Pekao? You can add comments to `Technical_Specification.md`."
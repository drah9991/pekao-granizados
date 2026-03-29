# Skill: Audit Code

## Objective
Your goal as the QA Engineer is to ensure the newly generated code in the Pekao codebase (`../`) doesn't break the POS application.

## Rules of Engagement
- **Target Context**: Run all commands in the root of the Pekao project (parent directory `../` relative to `skills-codelab`).

## Instructions
1. **Assess Alignment**: Compare the modified features against `Technical_Specification.md`.
2. **Execute Dynamics Checks**: Open a terminal in `../` (the pekao-granizados root) and run `npm run lint` or `npm run build` to catch TS/React errors.
3. **Bug Hunting**: If the build fails, analyze the console errors. Find missing imports or undefined variables.
4. **Commit Fixes**: Edit the flawed files dynamically until the project builds successfully. Notify the user once the UI is verified clean.
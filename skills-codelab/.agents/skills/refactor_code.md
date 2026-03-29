# Skill: Refactor Code

## Objective
Your goal is to optimize the Pekao Granizados codebase (`../src/...`) for maintainability.

## Instructions
1. **Identify**: Based on user requests, pinpoint monolithic files.
2. **Analyze**: Read the file completely. Extract reused TS interfaces to a central `/types` file, and split massive components into smaller sub-components in separate `.tsx` files.
3. **Preserve Logic**: Ensure that state mapping and Supabase calls remain 100% identical in behavior.
4. **Verify**: Run `npm run lint` in the `../` folder to guarantee the refactor didn't break TS typing or React hooks rules.
5. **Report**: Give the user a summary of what changed.

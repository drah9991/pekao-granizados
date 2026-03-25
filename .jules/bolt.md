
## 2025-03-05 - Avoid running package managers locally without node_modules
**Learning:** Running `bun install` or `pnpm install` in this environment to fix linting errors might unintentionally modify `bun.lockb` and `bun.lock` with a vast number of unprompted changes, creating a huge diff that pollutes the PR.
**Action:** Be extremely careful about running dependency installation commands unless explicitly necessary. Always check `git status` to ensure `lock` files weren't unintentionally changed or overwritten. Restore them via `git restore --staged <file> && git checkout <file>` if they are inadvertently changed.

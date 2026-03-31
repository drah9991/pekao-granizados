## 2025-05-22 - [POS Cart UX & Accessibility]
**Learning:** Destructive actions like clearing a cart should use `AlertDialog` for a consistent and accessible experience, rather than `window.confirm`. Keyboard shortcuts must be globally synchronized with UI hints (`<kbd>` tags) and carefully scoped to avoid triggering while typing in inputs.
**Action:** Always verify that `Enter` or search shortcuts (`/`) check if `e.target` is an `INPUT` or `TEXTAREA`. Use `Tooltip` and `aria-label` for all icon-only buttons by default.

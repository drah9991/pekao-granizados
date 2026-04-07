## 2024-03-23 - [Cart Accessibility & Safety]
**Learning:** Destructive actions like "Clear Cart" must have confirmation steps in the UI even if the keyboard shortcut already has one. Icon-only buttons in dense POS interfaces require both tooltips and aria-labels for clarity and accessibility.
**Action:** Always wrap icon-only buttons in `Tooltip` and add `aria-label` during initial implementation. Ensure confirmation logic is shared between UI interactions and shortcuts.

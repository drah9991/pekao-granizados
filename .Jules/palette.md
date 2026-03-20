## 2025-05-15 - [ARIA Labels and Keyboard Accessibility]
**Learning:** Icon-only buttons in the POS and Auth components often lack descriptive ARIA labels, and the password visibility toggle was explicitly excluded from keyboard navigation via `tabIndex={-1}`.
**Action:** Always provide `aria-label` to icon-only buttons and ensure interactive elements like password toggles are focusable and use dynamic ARIA labels (e.g., "Mostrar/Ocultar contraseña").

## 2025-05-15 - [Consolidated Destructive Action Logic]
**Learning:** The "Clear Cart" action had inconsistent confirmation logic between the UI button (no confirmation) and the keyboard shortcut (with confirmation).
**Action:** Consolidate destructive action logic into a single handler that includes a confirmation dialog to ensure a safe and consistent user experience across all interaction methods.

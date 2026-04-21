---
name: frontend-patterns
description: React and Tailwind CSS best practices, component composition, and state management patterns.
origin: ECC (adapted)
---

React and Tailwind CSS best practices for building modern, responsive, and maintainable user interfaces.

### Component Composition
- Build complex UI from small, focused components
- Use the Container/Presenter pattern to separate logic from UI
- Use custom hooks for reusable stateful logic

### Styling with Tailwind
- Use utility classes consistently
- Use `cn()` utility for conditional classes
- Prefer CSS variables for themes and colors

### State Management
- Use local state (`useState`) for UI-only state
- Use Context for global themes or auth
- Use React Query for server state management
- Never mutate state directly; use functional updates

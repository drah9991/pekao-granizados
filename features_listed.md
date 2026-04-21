# Pekao Granizados: Technical Feature Blueprint (v2.0 Pro Max)

This document serves as a technically precise specification of the Pekao Granizados system. It uses the **ECC (Everything Claude Code)** architectural pattern and the **"Pro Max"** design language.

---

## 1. Core Architecture & Tech Stack

- **Stack**: React (Vite) + TypeScript + TailwindCSS + Supabase.
- **Architectural Pattern**: ECC (Hook-based state management, presentational components, orchestrating pages).
- **Design System**: "Pro Max" (Glassmorphism, Aurora backgrounds, Framer Motion animations, Bento Grid layouts).
- **Persistence**: PostgreSQL (Supabase) with Row Level Security (RLS) and Tenant Isolation.

---

## 2. User Interface & Experience (UX)

### [PROMPT] Global Layout & Navigation
Implement a responsive sidebar-based layout with `glass-pro` styling. The navigation must support role-based visibility and collapsible groups. Include a global `InteractiveCursor` and `bg-aurora` background with `animate-aurora`.

### [PROMPT] Authentication & Identity
Create a login page with a `glass-pro` container and `animate-aurora` background. Integrate with Supabase Auth and a custom `BrandingContext` to load business logos dynamically.

### [PROMPT] Dashboard (Zero-Scroll)
Implement a dashboard using a Bento Grid architecture. Every widget must be a `Card` with `glass-pro` and `shadow-glow-pro`. Use `React.lazy` to load non-critical widgets and `Suspense` with shimmer skeletons.

---

## 3. Operations & Sales

### [PROMPT] Point of Sale (POS) Interface
Build a real-time POS system with product categorization and variant selection (sizes, flavors). The system must:
- Deduct stock atomically via a Supabase RPC function.
- Support "Cart" logic with real-time total calculation.
- Require an active "Turn" (Arqueo) to process payments.
- Support Multiple Payment Methods (Cash, Electronic).

### [PROMPT] Cash Register & Turns (Arqueo)
Implement a "Turn" system where users must "Open" the register with a base amount.
- Track every cash transaction (sales, deposits, withdrawals).
- Provide a "Close Turn" workflow that reconciles expected vs. actual cash.
- Visualize turn status globally via a `TurnStatusChip`.

### [PROMPT] Expense Management (Gastos)
Implement a financial outflow module that allows recording business expenses categorized by type (Servicios, Arriendo, Insumos, etc.). Include a KPI dashboard with:
- Monthly and Daily total spend.
- Category distribution visualization.
- Filterable history with "Pro Max" cards.

---

## 4. Inventory & Audit

### [PROMPT] Kardex (Digital Movements)
Create a "Kardex Digital" page for atomic asset traceability. Every stock change (sale, entry, exit, waste) must be recorded with a timestamp, user, and justification. Use `framer-motion` for smooth list transitions.

### [PROMPT] Recipe & Production Engine
Implement a system to define product recipes based on raw materials (inventory items). 
- When a product is sold, the system must deduct the proportional ingredients from inventory.
- Support "Mix Preparations" (pre-calculated batches).

---

## 5. Administration & Settings

### [PROMPT] Multi-Store & User Management
Implement a master entity manager for Stores and Users.
- Support role assignment (Admin, Manager, Cashier, Owner).
- Isolate data per `store_id` using RLS policies and the `get_auth_store_id()` DB function.

### [PROMPT] Dynamic Branding & Configuration
Create a settings panel with lazy-loaded tabs for:
- Visual Branding (Logo, brand colors).
- Thermal Receipt Templates (Header, Footer, Content).
- System-wide SKU Acronyms and Product Sizes.

---

## 6. Real-time & Performance

- **Caching**: Use `@tanstack/react-query` for all data fetching.
- **Lazy Loading**: All routes must use dynamic imports (`React.lazy`).
- **Real-time Alerts**: Implement a `useRealtimeAlerts` hook to listen to low stock or critical events via Supabase Realtime.

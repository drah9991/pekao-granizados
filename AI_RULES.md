# AI Rules for Pekao Granizados Application

This document outlines the technical stack and specific library usage guidelines for developing the Pekao Granizados application. Adhering to these rules ensures consistency, maintainability, and leverages the strengths of the chosen technologies.

## Tech Stack Overview

The Pekao Granizados application is built using a modern web development stack, focusing on performance, developer experience, and scalability:

*   **React & TypeScript**: The core of the application is built with React for dynamic user interfaces, enhanced by TypeScript for type safety and improved code quality.
*   **Vite**: A fast and efficient build tool that provides a rapid development environment and optimized production builds.
*   **Tailwind CSS**: A utility-first CSS framework used for all styling, enabling rapid UI development and consistent design.
*   **shadcn/ui**: A collection of beautifully designed, accessible, and customizable UI components built with Radix UI and Tailwind CSS.
*   **React Router DOM**: Used for declarative client-side routing, managing navigation within the single-page application.
*   **Supabase**: Our backend-as-a-service solution, providing authentication, a PostgreSQL database, and storage capabilities.
*   **TanStack Query (React Query)**: Manages server state, including data fetching, caching, synchronization, and mutations, making data interactions robust and efficient.
*   **Lucide React**: A comprehensive icon library providing a wide range of vector icons for the application's UI.
*   **Sonner**: A modern, accessible, and customizable toast notification library for providing user feedback.
*   **React Hook Form & Zod**: Used together for efficient form management and robust schema-based validation.

## Library Usage Rules

To maintain a consistent and efficient codebase, please follow these guidelines for library usage:

*   **UI Components**:
    *   **Always** use components from `shadcn/ui` (`@/components/ui/`) for all standard UI elements (buttons, cards, inputs, dialogs, tabs, switches, selects, badges, radio groups, checkboxes, etc.).
    *   If a required component is not available in `shadcn/ui` or needs significant customization, create a new component in `src/components/` that either wraps `shadcn/ui` primitives or is built from scratch using Tailwind CSS. Do not modify `shadcn/ui` source files directly.
*   **Styling**:
    *   **Exclusively** use **Tailwind CSS** for all styling. Avoid writing custom CSS in separate `.css` files unless it's for global styles defined in `src/index.css` or specific overrides that cannot be achieved with Tailwind utility classes.
*   **Routing**:
    *   **Always** use `react-router-dom` for all client-side navigation and route management. Define routes in `src/App.tsx`.
*   **State Management & Data Fetching**:
    *   For managing server-side data (fetching, caching, updating, deleting data from Supabase), **always** use `TanStack Query`.
    *   For simple, local component state, `useState` and `useReducer` are appropriate.
*   **Icons**:
    *   **Always** use icons from the `lucide-react` library.
*   **Notifications**:
    *   **Always** use `sonner` for displaying toast notifications to the user.
*   **Backend Interaction**:
    *   **Always** interact with Supabase using the client instance provided at `src/integrations/supabase/client.ts`. This includes authentication, database queries, and storage operations.
*   **Form Handling & Validation**:
    *   For all forms, **always** use `react-hook-form` for form state management and submission.
    *   For schema validation of form inputs, **always** use `zod` in conjunction with `@hookform/resolvers`.
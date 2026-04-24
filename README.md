# 🌌 Pekao Granizados - POS & Inventory Management System

A high-performance, enterprise-grade Point of Sale (POS) and Inventory Management system designed specifically for the unique needs of **Pekao Granizados**. Featuring a "Deep Space" aesthetic and a precision dual-inventory engine.

![Brand Header](https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&q=80&w=1200)

## 🚀 Key Features

### 💎 Precision Inventory (Dual-Engine)
*   **Unit-Based Tracking**: Manage sachets, cups, and physical products with atomic precision.
*   **Volume-Based Monitoring (ml)**: Real-time calculation of granizado mixtures based on oz-to-ml conversion and portion size multipliers.
*   **Atomic Transactions**: Database-level RPCs ensure inventory integrity even during simultaneous sales.

### 🌓 "Deep Space" Interface
*   **Next-Gen UI/UX**: A dark-mode optimized, distraction-free environment built for speed and visual excellence.
*   **Real-Time Dashboard**: Monitor sales, mixture levels, and store performance at a glance with sleek data visualizations.
*   **Dynamic Pricing**: Time-based and category-based rules that apply discounts automatically.

### 📡 High-Reliability Operations
*   **Offline-First Mode**: Process sales even without internet connectivity; orders sync automatically when back online.
*   **Mobile Monitoring**: Remote access to sales and inventory levels via the Antigravity mobile integration.
*   **Sentry Monitoring**: Integrated error tracking and performance profiling for maximum uptime.

## 🛠️ Technology Stack

*   **Core**: [Vite](https://vitejs.dev/) + [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) + [Framer Motion](https://www.framer.com/motion/)
*   **Backend**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage + RPC)
*   **State Management**: [Zustand](https://docs.pmnd.rs/zustand/) + [TanStack Query (v5)](https://tanstack.com/query/latest)
*   **Analytics**: [Recharts](https://recharts.org/) + [Sentry](https://sentry.io/)

## 💻 Local Development

1.  **Clone & Install**
    ```bash
    git clone <repository-url>
    cd pekao-granizados
    npm install
    ```

2.  **Environment Setup**
    Create a `.env` file based on `.env.example` with your Supabase credentials.

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 📦 Deployment

Optimized for **Vercel** with automatic analytics and speed insights.

1.  Push to `main` branch.
2.  Vercel will trigger a production build.
3.  Analytics will be available in the Vercel Dashboard.

---

*Built with ❤️ for the Pekao Granizados team.*

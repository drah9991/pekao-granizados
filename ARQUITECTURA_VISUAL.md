# Arquitectura de Testing - Pekao Granizados POS

## 📊 Diagrama de Flujo de Testing

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DESARROLLO LOCAL                                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   git commit         │
                    │   git push           │
                    └───────────┬──────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────────┐
│                        GITHUB ACTIONS CI/CD                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Unit Tests   │  │  E2E Tests   │  │   Lint       │                 │
│  │   Vitest     │  │  Playwright  │  │   ESLint     │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                  │                          │
│         └──────────┬───────┴──────────────────┘                          │
│                    │                                                     │
│         ┌──────────▼───────────┐                                        │
│         │  TypeScript Check    │                                        │
│         └──────────┬───────────┘                                        │
│                    │                                                     │
│         ┌──────────▼───────────┐                                        │
│         │  Build Production    │                                        │
│         └──────────┬───────────┘                                        │
│                    │                                                     │
│         ┌──────────▼───────────┐                                        │
│         │  Security Audit      │                                        │
│         └──────────┬───────────┘                                        │
│                    │                                                     │
└────────────────────┼─────────────────────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   ✅ ALL TESTS PASS     │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │   READY FOR STAGING     │
        └─────────────────────────┘
```

## 🏗️ Arquitectura de Capas

```
┌───────────────────────────────────────────────────────────────────┐
│                          UI LAYER                                 │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐               │
│  │ POS Page   │  │ Dashboard  │  │ Inventory   │               │
│  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘               │
│        │                │                 │                       │
│        └────────────────┼─────────────────┘                       │
│                         │                                         │
│              ┌──────────▼───────────┐                            │
│              │ Error Boundaries     │  ← Aísla fallos           │
│              │ (Granular)           │                            │
│              └──────────┬───────────┘                            │
└───────────────────────────┼─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐     │
│  │ useCart  │  │ usePOS   │  │ useInv.   │  │ useAuth  │     │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘     │
│       │             │               │             │             │
│       └─────────────┼───────────────┴─────────────┘             │
│                     │                                           │
│          ┌──────────▼──────────┐                               │
│          │  Zustand Stores     │                               │
│          │  React Query Cache  │  ← Optimizado 15min          │
│          └──────────┬──────────┘                               │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                     NETWORK LAYER                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Offline Sync + Exponential Backoff                    │    │
│  │  1s → 2s → 4s → 8s → 16s (con jitter)                 │    │
│  └────────────────────┬───────────────────────────────────┘    │
│                       │                                         │
│          ┌────────────▼──────────────┐                         │
│          │  Supabase Client          │                         │
│          │  - Auth                   │                         │
│          │  - Realtime               │                         │
│          │  - RPC Functions          │                         │
│          └────────────┬──────────────┘                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                     DATABASE LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL (Supabase)                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────┐        │   │
│  │  │ Tables   │  │ RLS      │  │ Functions     │        │   │
│  │  │ + Data   │  │ Policies │  │ + Triggers    │        │   │
│  │  └──────────┘  └──────────┘  └───────────────┘        │   │
│  │                                                         │   │
│  │  Rate Limiting: login_attempts table                   │   │
│  │  ✓ is_account_locked()                                 │   │
│  │  ✓ record_login_attempt()                              │   │
│  │  ✓ get_lockout_remaining_time()                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔒 Flujo de Rate Limiting

```
┌────────────────────────────────────────────────────────────────┐
│                    USUARIO INTENTA LOGIN                        │
└────────────────────────┬───────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Frontend:           │
              │ checkAccountLocked()│
              └──────────┬──────────┘
                         │
                    ┌────▼─────┐
                    │ Locked? │
                    └────┬─────┘
                         │
           ┌─────────────┴──────────────┐
           │                            │
        NO │                         YES│
           │                            │
  ┌────────▼────────┐        ┌─────────▼────────┐
  │ Permitir login  │        │ Rechazar login   │
  │                 │        │ Mostrar tiempo   │
  │ Intentar auth   │        │ restante         │
  └────────┬────────┘        └──────────────────┘
           │
           │
    ┌──────▼───────┐
    │ Auth exitoso?│
    └──────┬───────┘
           │
    ┌──────┴───────┐
    │              │
  SI│            NO│
    │              │
┌───▼────┐    ┌───▼────────────────┐
│Success │    │ record_login_      │
│        │    │ attempt(failed)    │
│Clear   │    │                    │
│attempts│    │ Count++            │
└────────┘    └────┬───────────────┘
                   │
            ┌──────▼──────┐
            │ Count >= 5? │
            └──────┬──────┘
                   │
            ┌──────┴──────┐
            │             │
          NO│           YES│
            │             │
    ┌───────▼──┐   ┌──────▼─────────┐
    │ Permitir │   │ Cuenta bloqueada│
    │ reintentar│  │ por 15 minutos  │
    └──────────┘   └─────────────────┘
```

## 🔄 Flujo de Offline Sync con Backoff

```
┌────────────────────────────────────────────────────────────────┐
│           USUARIO REALIZA VENTA (Modo Offline)                 │
└────────────────────────┬───────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Guardar en          │
              │ IndexedDB           │
              │ (pendingOrders)     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ isOnline?           │
              └──────────┬──────────┘
                         │
                    ┌────┴─────┐
                    │          │
                 NO │       YES│
                    │          │
         ┌──────────▼─┐   ┌────▼─────────┐
         │  Esperar   │   │  Intentar    │
         │  conexión  │   │  sync        │
         └──────────┬─┘   └────┬─────────┘
                    │          │
                    │     ┌────▼──────┐
                    │     │ Exitoso?  │
                    │     └────┬──────┘
                    │          │
                    │     ┌────┴─────┐
                    │     │          │
                    │  SI │       NO │
                    │     │          │
         ┌──────────┴─────▼┐   ┌─────▼──────────┐
         │   Sincronizado  │   │  Retry con     │
         │   ✓             │   │  Backoff       │
         └─────────────────┘   └─────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  Intento 1: 1s      │
                          │  Intento 2: 2s      │
                          │  Intento 3: 4s      │
                          │  Intento 4: 8s      │
                          │  Intento 5: 16s     │
                          └──────────┬──────────┘
                                     │
                              ┌──────▼──────┐
                              │  Exitoso?   │
                              └──────┬──────┘
                                     │
                              ┌──────┴──────┐
                              │             │
                           SI │          NO │
                              │             │
                   ┌──────────▼┐      ┌─────▼────────┐
                   │ Limpiar   │      │ Mantener en  │
                   │ IndexedDB │      │ IndexedDB    │
                   │ ✓         │      │ Reintentar   │
                   └───────────┘      │ más tarde    │
                                      └──────────────┘
```

## 📦 Bundle Optimization Strategy

```
ANTES:
┌──────────────────────────────────────┐
│  main.js (850 KB)                    │
│  ┌────────────────────────────────┐  │
│  │ React + Router + Query         │  │
│  │ Radix UI                       │  │
│  │ Recharts + D3                  │  │
│  │ Framer Motion                  │  │
│  │ Supabase                       │  │
│  │ jsPDF + XLSX                   │  │
│  │ + Todo el resto                │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
         ⚠️ Carga lenta (3-5s)

DESPUÉS:
┌──────────────────────────────────────┐
│  main.js (250 KB) ⚡                 │
│  ┌────────────────────────────────┐  │
│  │ App + Layout básico            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
│
├─ vendor-react.js (120 KB)
│  └─ React + ReactDOM + Router
│
├─ vendor-ui.js (180 KB)
│  └─ @radix-ui components
│
├─ vendor-query.js (50 KB)
│  └─ React Query
│
├─ vendor-supabase.js (80 KB)
│  └─ Supabase client
│
├─ vendor-charts.js (200 KB) ← Lazy
│  └─ Recharts + D3
│
├─ vendor-motion.js (100 KB) ← Lazy
│  └─ Framer Motion
│
└─ vendor-exports.js (150 KB) ← Lazy
   └─ jsPDF + XLSX

✅ Carga inicial rápida (1-2s)
✅ Recursos pesados cargan bajo demanda
✅ Mejor caché por separación
```

## 🎯 Testing Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTING PYRAMID                          │
└─────────────────────────────────────────────────────────────┘

                    ┌─────┐
                    │ E2E │  ← 5 tests (Playwright)
                    │Tests│    Flujos críticos
                    └──┬──┘
                      ▲│▼
                ┌─────┴──────┐
                │ Integration│  ← Futuro
                │   Tests    │    (Fase 2)
                └─────┬──────┘
                      ▲│▼
            ┌─────────┴──────────┐
            │   Component Tests  │  ← Futuro
            │   (React Testing)  │    (Fase 2)
            └─────────┬──────────┘
                      ▲│▼
        ┌─────────────┴─────────────┐
        │      Unit Tests            │  ← 8+ tests (Vitest)
        │   (Hooks + Utils)          │    Lógica crítica
        └────────────────────────────┘
              ▲│▼  ← Mayor cantidad
        ┌─────┴──────┐
        │   Static   │  ← TypeScript + ESLint
        │  Analysis  │    Siempre activo
        └────────────┘

COBERTURA OBJETIVO:
├─ Hooks críticos: 80%
├─ Utils: 80%
├─ Components: 50%
└─ Global: 60%

ACTUAL (Fase 1):
├─ useCart: 85% ✅
├─ Utils: 0% 🔄
├─ Components: 0% 🔄
└─ Global: 35% 🔄
```

## 📈 Performance Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                   MÉTRICAS OBJETIVO                          │
└─────────────────────────────────────────────────────────────┘

First Contentful Paint (FCP)
├─ Target: < 1.5s
├─ Good: < 1.8s
└─ Poor: > 3.0s

Largest Contentful Paint (LCP)
├─ Target: < 2.5s
├─ Good: < 4.0s
└─ Poor: > 4.0s

Time to Interactive (TTI)
├─ Target: < 3.5s
├─ Good: < 7.3s
└─ Poor: > 7.3s

Cumulative Layout Shift (CLS)
├─ Target: < 0.1
├─ Good: < 0.25
└─ Poor: > 0.25

Bundle Size
├─ Initial: < 300 KB (gzipped)
├─ Total: < 1.5 MB
└─ Lazy chunks: < 200 KB cada uno

Network Requests (Cache)
├─ Products: 15 min cache
├─ Categories: 15 min cache
├─ Customers: 15 min cache
└─ Orders: 5 min cache
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY STACK                            │
└─────────────────────────────────────────────────────────────┘

Layer 1: Network
├─ HTTPS only
├─ CORS configured
└─ Rate limiting (5 attempts/15min)

Layer 2: Authentication
├─ Supabase Auth (JWT)
├─ Token refresh automático
└─ Session management

Layer 3: Authorization
├─ Row Level Security (RLS)
├─ Role-based (admin/manager/cashier)
└─ Store-based isolation

Layer 4: Input Validation
├─ Zod schemas
├─ SQL injection protection
└─ XSS sanitization

Layer 5: Data Protection
├─ Sensitive data masked
├─ Audit logs
└─ Backup strategy

Layer 6: Client-side
├─ No secrets in localStorage
├─ Error boundaries
└─ Security headers
```

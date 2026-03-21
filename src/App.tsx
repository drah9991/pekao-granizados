import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { BrandingProvider } from "@/context/BrandingContext";
import { AuthProvider } from "@/context/AuthContext";
import { TurnProvider } from "@/context/TurnContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eager imports — critical path (landing, login, 404)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy imports — code-split per route
const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const Settings = lazy(() => import("./pages/Settings"));
const Sales = lazy(() => import("./pages/Sales"));
const Invoices = lazy(() => import("./pages/Invoices"));
const Movements = lazy(() => import("./pages/Movements"));
const Customers = lazy(() => import("./pages/Customers"));
const Marketing = lazy(() => import("./pages/Marketing"));
const CashRegister = lazy(() => import("./pages/CashRegister"));
const Products = lazy(() => import("./pages/Products"));
const Users = lazy(() => import("./pages/Users"));
const Stores = lazy(() => import("./pages/Stores"));
const Reports = lazy(() => import("./pages/Reports"));
const InventoryManagement = lazy(() => import("./components/settings/InventoryManagement").then(m => ({ default: m.InventoryManagement })));
const RecipeManagement = lazy(() => import("./components/settings/RecipeManagement").then(m => ({ default: m.RecipeManagement })));

const queryClient = new QueryClient();

// Loading fallback for Suspense
const PageLoader = () => (
  <div className="flex flex-col h-screen items-center justify-center bg-[#0F1117]">
    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
    <p className="text-slate-500 text-sm font-bold animate-pulse">Cargando módulo...</p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TurnProvider>
    <ThemeProvider defaultTheme="system" attribute="class">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrandingProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes — each wrapped in ErrorBoundary */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary fallbackTitle="Error en Dashboard">
                      <Dashboard />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Punto de Venta">
                      <POS />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Ventas">
                      <Sales />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Facturas">
                      <Invoices />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/movements"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Movimientos">
                      <Movements />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Clientes">
                      <Customers />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/marketing"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Marketing">
                      <Marketing />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cash-register"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Arqueo de Caja">
                      <CashRegister />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Configuración">
                      <Settings />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Productos">
                      <Products />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Inventario">
                      <InventoryManagement />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recipes"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Recetas">
                      <RecipeManagement />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Usuarios">
                      <Users />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stores"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Tiendas">
                      <Stores />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Reportes">
                      <Reports />
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </BrandingProvider>
      </TooltipProvider>
    </ThemeProvider>
    </TurnProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

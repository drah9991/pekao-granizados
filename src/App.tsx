import { lazy, Suspense, useState } from "react";

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
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";

// Eager imports — critical path (landing, login, 404)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";

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
const Expenses = lazy(() => import("./pages/Expenses"));
const Products = lazy(() => import("./pages/Products"));
const Users = lazy(() => import("./pages/Users"));
const Stores = lazy(() => import("./pages/Stores"));
const Reports = lazy(() => import("./pages/Reports"));
const Preparation = lazy(() => import("./pages/Preparation"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Units = lazy(() => import("./pages/Units"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const CashReconciliations = lazy(() => import("./pages/CashReconciliations"));
const CanceledOrders = lazy(() => import("./pages/CanceledOrders"));
const InventoryManagement = lazy(() => import("./components/settings/InventoryManagement").then(m => ({ default: m.InventoryManagement })));

const RecipeManagement = lazy(() => import("./components/settings/RecipeManagement").then(m => ({ default: m.RecipeManagement })));
const DigitalMenu = lazy(() => import("./pages/DigitalMenu"));
const PrintManagerModule = lazy(() => import("./pages/PrintManagerModule"));
const Workflow = lazy(() => import("./pages/Workflow"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const LoyaltyCRM = lazy(() => import("./pages/CRM/Loyalty"));
const Affiliates = lazy(() => import("./pages/Affiliates"));

// Free Tools (SEO Lead Magnets)
const BarcodeGenerator = lazy(() => import("./pages/Tools/BarcodeGenerator"));
const MarginCalculator = lazy(() => import("./pages/Tools/MarginCalculator"));

const ProductsInventoryLayout = lazy(() => import("./components/inventory/ProductsInventoryLayout").then(m => ({ default: m.ProductsInventoryLayout })));
const RecipeBuilder = lazy(() => import("./components/inventory/RecipeBuilder").then(m => ({ default: m.RecipeBuilder })));

// El queryClient se inicializa dentro del componente App para asegurar estabilidad con HMR


// Loading fallback for Suspense
const PageLoader = () => (
  <div className="flex flex-col h-screen items-center justify-center bg-background bg-aurora animate-aurora relative overflow-hidden">
    <div className="relative z-10 flex flex-col items-center">
      <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-glow-pro animate-pro-in">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
      <p className="text-primary font-black uppercase tracking-[0.4em] text-[10px] mt-6 animate-pulse font-space-grotesk">Sincronizando v2.0</p>
    </div>
  </div>
);

const App = () => {
  // Inicialización estable del QueryClient
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutos
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TurnProvider>
          <ThemeProvider defaultTheme="system" attribute="class">
            <TooltipProvider>
              <Toaster />
        <Sonner />
        <SpeedInsights />
        <Analytics />
        <BrandingProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Free Tools Routes */}
              <Route path="/tools/generador-codigos-de-barras" element={
                <Suspense fallback={<PageLoader />}>
                  <BarcodeGenerator />
                </Suspense>
              } />
              <Route path="/tools/calculadora-margen-ganancia" element={
                <Suspense fallback={<PageLoader />}>
                  <MarginCalculator />
                </Suspense>
              } />

              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />

              {/* Protected Routes — each with its own Suspense + ErrorBoundary */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary fallbackTitle="Error en Dashboard">
                      <Suspense fallback={<PageLoader />}>
                        <Dashboard />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Punto de Venta">
                      <Suspense fallback={<PageLoader />}>
                        <POS />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/print-center"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Centro de Copiado">
                      <Suspense fallback={<PageLoader />}>
                        <PrintManagerModule />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Ventas">
                      <Suspense fallback={<PageLoader />}>
                        <Sales />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales/canceled"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Pedidos Cancelados">
                      <Suspense fallback={<PageLoader />}>
                        <CanceledOrders />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Facturas">
                      <Suspense fallback={<PageLoader />}>
                        <Invoices />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/movements"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Movimientos">
                      <Suspense fallback={<PageLoader />}>
                        <Movements />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Clientes">
                      <Suspense fallback={<PageLoader />}>
                        <Customers />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/marketing"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Marketing">
                      <Suspense fallback={<PageLoader />}>
                        <Marketing />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/crm/loyalty"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "owner"]}>
                    <ErrorBoundary fallbackTitle="Error en Fidelización (CRM)">
                      <Suspense fallback={<PageLoader />}>
                        <LoyaltyCRM />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cash-register"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Arqueo de Caja">
                      <Suspense fallback={<PageLoader />}>
                        <CashRegister />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cash-reconciliations"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Cuadre de Caja">
                      <Suspense fallback={<PageLoader />}>
                        <CashReconciliations />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "owner"]}>
                    <ErrorBoundary fallbackTitle="Error en Gastos">
                      <Suspense fallback={<PageLoader />}>
                        <Expenses />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Configuración">
                      <Suspense fallback={<PageLoader />}>
                        <Settings />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/affiliates"
                element={
                  <ProtectedRoute requiredRole={["admin", "owner"]}>
                    <ErrorBoundary fallbackTitle="Error en Afiliados">
                      <Suspense fallback={<PageLoader />}>
                        <Affiliates />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Productos">
                      <Suspense fallback={<PageLoader />}>
                        <Products />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "owner", "store_manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Inventario">
                      <Suspense fallback={<PageLoader />}>
                        <Inventory />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Catálogo e Inventario">
                      <Suspense fallback={<PageLoader />}>
                        <ProductsInventoryLayout />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              >
                <Route path="inventory/recipes" element={<RecipeBuilder />} />
                <Route path="inventory/units" element={<Units />} />
                <Route path="inventory/suppliers" element={<Suppliers />} />
              </Route>
              <Route
                path="/recipes"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Recetas">
                      <Suspense fallback={<PageLoader />}>
                        <RecipeManagement />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Usuarios">
                      <Suspense fallback={<PageLoader />}>
                        <Users />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stores"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Sucursales">
                      <Suspense fallback={<PageLoader />}>
                        <Stores />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <ErrorBoundary fallbackTitle="Error en Reportes">
                      <Suspense fallback={<PageLoader />}>
                        <Reports />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/preparation"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <ErrorBoundary fallbackTitle="Error en Preparación">
                      <Suspense fallback={<PageLoader />}>
                        <Preparation />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/digital-menu"
                element={
                  <ErrorBoundary fallbackTitle="Error en Menú Digital">
                    <Suspense fallback={<PageLoader />}>
                      <DigitalMenu />
                    </Suspense>
                  </ErrorBoundary>
                }
              />

              {/* Catch-all route */}
              <Route
  path="/workflow"
  element={
    <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
      <ErrorBoundary fallbackTitle="Error en Workflow">
        <Suspense fallback={<PageLoader />}> 
          <Workflow />
        </Suspense>
      </ErrorBoundary>
    </ProtectedRoute>
  }
/>

<Route
  path="/superadmin"
  element={
    <ProtectedRoute>
      <ErrorBoundary fallbackTitle="Error en Panel Maestro">
        <Suspense fallback={<PageLoader />}> 
          <SuperAdmin />
        </Suspense>
      </ErrorBoundary>
    </ProtectedRoute>
  }
/>

{/* Catch-all route */}
<Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </BrandingProvider>
      </TooltipProvider>
    </ThemeProvider>
    </TurnProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;


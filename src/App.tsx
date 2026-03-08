import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { BrandingProvider } from "@/context/BrandingContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Settings from "./pages/Settings";
import Sales from "./pages/Sales";
import Invoices from "./pages/Invoices";
import Movements from "./pages/Movements";
import Customers from "./pages/Customers";
import CashRegister from "./pages/CashRegister";
import Products from "./pages/Products";
import { InventoryManagement } from "./components/settings/InventoryManagement";
import { RecipeManagement } from "./components/settings/RecipeManagement";
import Users from "./pages/Users";
import Stores from "./pages/Stores";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" attribute="class">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrandingProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <POS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <Sales />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/movements"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager"]}>
                    <Movements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cash-register"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <CashRegister />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <Products />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <InventoryManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recipes"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <RecipeManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stores"
                element={
                  <ProtectedRoute requiredRole={["admin", "manager", "cashier"]}>
                    <Stores />
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
  </QueryClientProvider>
);

export default App;

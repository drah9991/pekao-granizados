import React from "react";
import Layout from "@/components/Layout";
import { AlertTriangle, ShoppingCart, DollarSign, Package, Database, BarChart3, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { FavoritesWidget } from "@/components/dashboard/FavoritesWidget";
import { cn } from "@/lib/utils";
import { BoneyardSkeleton } from "@/components/ui/BoneyardSkeleton";
import { useBoneyardLoad } from "@/hooks/useBoneyardLoad";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const {
    period, setPeriod, uiConfig, setUiConfig, isSavingConfig, isLoading, isPending, error,
    dashboardData, comparisonLabel, handleSaveConfig
  } = useDashboard(storeId);

  const isBoneyardLoading = useBoneyardLoad(isLoading);

  if (error) {
    return (
      <Layout>
        <div className="flex h-[calc(100vh-64px)] items-center justify-center p-10 font-poppins">
           <Card className="bg-destructive/10 border-destructive/20 p-8 text-center max-w-md rounded-[2.5rem] shadow-2xl">
              <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <CardTitle className="text-foreground text-2xl font-black mb-2">Error de Sincronización</CardTitle>
              <CardDescription className="text-red-400 font-medium mb-6">
                {error?.message || (error as Record<string, unknown>)?.details || JSON.stringify(error)}
              </CardDescription>
              <Button className="w-full gradient-primary h-14 rounded-2xl font-black text-lg shadow-glow-primary active:scale-95 transition-all" onClick={() => window.location.reload()}>
                Reintentar Sincronización
              </Button>
           </Card>
        </div>
      </Layout>
    );
  }

  const quickActions = [
    { title: "Vender (POS)", path: "/pos", icon: ShoppingCart, color: "text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20" },
    { title: "Arqueo Caja", path: "/cash-register", icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
    { title: "Productos", path: "/products", icon: Package, color: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
    { title: "Inventario", path: "/inventory", icon: Database, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20" },
    { title: "Estadísticas", path: "/reports", icon: BarChart3, color: "text-purple-500 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20" },
  ];

  return (
    <Layout>
      <div className={cn(
        "min-h-screen p-4 md:p-8 space-y-8 animate-pro-in transition-all duration-200",
        isPending && "opacity-80"
      )}>
        {/* Header con selectores de período */}
        <DashboardHeader 
          period={period}
          setPeriod={setPeriod}
          uiConfig={uiConfig}
          setUiConfig={setUiConfig}
          isSavingConfig={isSavingConfig}
          handleSaveConfig={handleSaveConfig}
        />

        {/* Quick Actions Panel */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className={cn(
                "flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 font-space-grotesk italic text-left group cursor-pointer shadow-sm",
                action.color
              )}
            >
              <div className="flex items-center gap-3">
                <action.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span className="text-xs font-black uppercase tracking-wider">{action.title}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>
          ))}
        </div>

        {/* Widget de Favoritos */}
        <FavoritesWidget />

        {/* Rejilla Principal con Caché Optimizado */}
        <BoneyardSkeleton name="pekao-dashboard-grid" isLoading={isBoneyardLoading} animate="wave">
          {dashboardData && (
            <DashboardGrid 
              uiConfig={uiConfig}
              dashboardData={dashboardData}
              comparisonLabel={comparisonLabel}
            />
          )}
        </BoneyardSkeleton>
      </div>
    </Layout>
  );
}

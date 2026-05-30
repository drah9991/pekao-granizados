import React from "react";
import Layout from "@/components/Layout";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { DashboardSkeleton, WidgetSkeleton } from "@/components/dashboard/DashboardSkeletons";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { FavoritesWidget } from "@/components/dashboard/FavoritesWidget";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { storeId } = useAuth();
  const {
    period, setPeriod, uiConfig, setUiConfig, isSavingConfig, isLoading, isPending, error,
    dashboardData, comparisonLabel, handleSaveConfig
  } = useDashboard(storeId);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen p-2 md:p-4 lg:p-6 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/50">
             <div className="animate-pulse h-12 w-64 bg-muted/40 rounded-xl" />
             <div className="h-12 w-48 bg-muted/20 rounded-xl" />
          </div>
          <DashboardSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <WidgetSkeleton className="lg:col-span-2" />
             <WidgetSkeleton />
          </div>
        </div>
      </Layout>
    );
  }

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
                {(error as any)?.message || (error as any)?.details || JSON.stringify(error)}
              </CardDescription>
              <Button className="w-full gradient-primary h-14 rounded-2xl font-black text-lg shadow-glow-primary active:scale-95 transition-all" onClick={() => window.location.reload()}>
                Reintentar Sincronización
              </Button>
           </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={cn(
        "min-h-screen p-2 md:p-4 lg:p-6 space-y-10 animate-pro-in transition-all duration-300",
        isPending && "opacity-50 pointer-events-none filter blur-[1px]"
      )}>
        <DashboardHeader 
          period={period}
          setPeriod={setPeriod}
          uiConfig={uiConfig}
          setUiConfig={setUiConfig}
          isSavingConfig={isSavingConfig}
          handleSaveConfig={handleSaveConfig}
        />

        <FavoritesWidget />

        <DashboardGrid 
          uiConfig={uiConfig}
          dashboardData={dashboardData}
          comparisonLabel={comparisonLabel}
        />
      </div>
    </Layout>
  );
}

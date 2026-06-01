import React, { lazy, Suspense } from "react";
import { DashboardSkeleton, WidgetSkeleton } from "@/components/dashboard/DashboardSkeletons";
import ErrorBoundary from "@/components/ErrorBoundary";

const StatCards = lazy(() => import("@/components/dashboard/StatCards").then(m => ({ default: m.StatCards })));
const SalesChartWidget = lazy(() => import("@/components/dashboard/SalesChartWidget").then(m => ({ default: m.SalesChartWidget })));
const PaymentMethodsWidget = lazy(() => import("@/components/dashboard/PaymentMethodsWidget").then(m => ({ default: m.PaymentMethodsWidget })));
const RecentSalesWidget = lazy(() => import("@/components/dashboard/RecentSalesWidget").then(m => ({ default: m.RecentSalesWidget })));
const PopularProductsWidget = lazy(() => import("@/components/dashboard/PopularProductsWidget").then(m => ({ default: m.PopularProductsWidget })));
const MixtureStockWidget = lazy(() => import("@/components/dashboard/MixtureStockWidget").then(m => ({ default: m.MixtureStockWidget })));

interface DashboardGridProps {
  uiConfig: Record<string, boolean | unknown>;
  dashboardData: Record<string, unknown>;
  comparisonLabel: string;
}

export default function DashboardGrid({ uiConfig, dashboardData, comparisonLabel }: DashboardGridProps) {
  return (
    <div className="dashboard-grid no-scrollbar pb-10">
        {uiConfig.showStats && (
            <div className="area-stats animate-pro-in">
                <ErrorBoundary fallbackTitle="Estadísticas">
                    <Suspense fallback={<DashboardSkeleton />}>
                        <StatCards data={dashboardData} label={comparisonLabel} />
                    </Suspense>
                </ErrorBoundary>
            </div>
        )}

        {uiConfig.showChart && (
            <div className="area-chart animate-pro-in delay-100">
                <div className="h-full bg-card dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-3xl p-1 transition-all duration-500 hover:bg-muted/30 dark:hover:bg-white/[0.04] overflow-hidden">
                    <ErrorBoundary fallbackTitle="Gráfico de Ventas">
                        <Suspense fallback={<WidgetSkeleton />}>
                            <SalesChartWidget data={dashboardData} />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </div>
        )}

        {uiConfig.showPaymentMethods && (
            <div className="area-pie animate-pro-in delay-200">
                <div className="h-full bg-card dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-3xl p-1 transition-all duration-500 hover:bg-muted/30 dark:hover:bg-white/[0.04] overflow-hidden">
                    <ErrorBoundary fallbackTitle="Métodos de Pago">
                        <Suspense fallback={<WidgetSkeleton height="h-[600px]" />}>
                            <PaymentMethodsWidget data={dashboardData} />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </div>
        )}

        {uiConfig.showMixtureStock && (
            <div className="area-stock animate-pro-in delay-300">
                <div className="h-full bg-card dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-3xl p-1 transition-all duration-500 hover:bg-muted/30 dark:hover:bg-white/[0.04] overflow-hidden">
                    <ErrorBoundary fallbackTitle="Stock de Mezcla">
                        <Suspense fallback={<WidgetSkeleton height="h-[300px]" />}>
                            <MixtureStockWidget data={dashboardData} />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </div>
        )}

        {uiConfig.showPopularProducts && (
            <div className="area-popular animate-pro-in delay-400">
                <div className="h-full bg-card dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-3xl p-1 transition-all duration-500 hover:bg-muted/30 dark:hover:bg-white/[0.04] overflow-hidden">
                    <ErrorBoundary fallbackTitle="Productos Populares">
                        <Suspense fallback={<WidgetSkeleton height="h-[300px]" />}>
                            <PopularProductsWidget data={dashboardData} />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </div>
        )}

        {uiConfig.showRecentSales && (
            <div className="area-recent animate-pro-in delay-500">
                <div className="h-full bg-card dark:bg-white/[0.02] border border-border dark:border-white/5 rounded-3xl p-1 transition-all duration-500 hover:bg-muted/30 dark:hover:bg-white/[0.04] overflow-hidden">
                    <ErrorBoundary fallbackTitle="Ventas Recientes">
                        <Suspense fallback={<WidgetSkeleton height="h-[400px]" />}>
                            <RecentSalesWidget data={dashboardData} />
                        </Suspense>
                    </ErrorBoundary>
                </div>
            </div>
        )}
    </div>
  );
}

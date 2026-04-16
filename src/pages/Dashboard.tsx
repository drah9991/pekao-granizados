import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useState, useMemo, useEffect } from "react";
import { 
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, endOfYear, 
  format, subWeeks, subMonths, subYears
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

// Imported Widgets
import { StatCards } from "@/components/dashboard/StatCards";
import { SalesChartWidget } from "@/components/dashboard/SalesChartWidget";
import { PaymentMethodsWidget } from "@/components/dashboard/PaymentMethodsWidget";
import { RecentSalesWidget } from "@/components/dashboard/RecentSalesWidget";
import { PopularProductsWidget } from "@/components/dashboard/PopularProductsWidget";
import { MixtureStockWidget } from "@/components/dashboard/MixtureStockWidget";

export default function Dashboard() {
  const { storeId, user } = useAuth();
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today");

  const ranges = useMemo(() => {
    const today = new Date();
    let current, comparison;

    switch (period) {
      case "today":
        current = { start: startOfDay(today).toISOString(), end: endOfDay(today).toISOString() };
        comparison = { start: startOfDay(subDays(today, 1)).toISOString(), end: endOfDay(subDays(today, 1)).toISOString() };
        break;
      case "week":
        current = { start: startOfWeek(today, { weekStartsOn: 1 }).toISOString(), end: endOfWeek(today, { weekStartsOn: 1 }).toISOString() };
        comparison = { start: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }).toISOString(), end: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }).toISOString() };
        break;
      case "month":
        current = { start: startOfMonth(today).toISOString(), end: endOfMonth(today).toISOString() };
        comparison = { start: startOfMonth(subMonths(today, 1)).toISOString(), end: endOfMonth(subMonths(today, 1)).toISOString() };
        break;
      case "year":
        current = { start: startOfYear(today).toISOString(), end: endOfYear(today).toISOString() };
        comparison = { start: startOfYear(subYears(today, 1)).toISOString(), end: endOfYear(subYears(today, 1)).toISOString() };
        break;
      default:
        current = { start: startOfDay(today).toISOString(), end: endOfDay(today).toISOString() };
        comparison = { start: startOfDay(subDays(today, 1)).toISOString(), end: endOfDay(subDays(today, 1)).toISOString() };
    }

    return { current, comparison };
  }, [period]);

  const { data: dashboardData, isLoading, error: queryError } = useQuery({
    queryKey: ["dashboard-v2-sync", storeId, period],
    queryFn: async () => {
      if (!storeId) {
        return null;
      }
      try {
        const [currentRes, comparisonRes, inventoryRes] = await Promise.all([
          supabase.from("orders").select("id, total, subtotal, tip_amount, delivery_fee, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end),
          supabase.from("orders").select("total, status").eq("store_id", storeId).gte("created_at", ranges.comparison.start).lte("created_at", ranges.comparison.end),
          (supabase as any).from("inventory_items").select("name, stock, min_stock, is_mixture").eq("store_id", storeId),
          supabase.from("sizes").select("name, multiplier").eq("store_id", storeId)
        ]);

        if (currentRes.error) {
          if (currentRes.error.message?.includes("delivery_fee")) {
            const fallback = await supabase.from("orders").select("id, total, subtotal, tip_amount, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end);
            if (fallback.error) throw fallback.error;
            currentRes.data = fallback.data as any;
          } else {
            throw currentRes.error;
          }
        }
        if (comparisonRes.error) throw comparisonRes.error;
        if (inventoryRes.error) throw inventoryRes.error;
        
        // Final dataset for analysis
        const orders = (currentRes?.data as any[]) || [];
        const completed = orders.filter(o => o.status === 'completed');
        const cancelled = orders.filter(o => o.status === 'cancelled');

        // Current Metrics
        const totalRevenue = completed.reduce((sum, o) => sum + (Number(o.total || 0) - Number(o.tip_amount || 0)), 0);
        const ordersCount = completed.length;
        const cancelledCount = cancelled.length;
        const avgTicket = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

        // Comparison Metrics
        const compOrders = (comparisonRes.data || []).filter(o => o.status === 'completed');
        const compRevenue = compOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const compCount = compOrders.length;
        const compAvg = compCount > 0 ? Math.round(compRevenue / compCount) : 0;
        const compCancelled = (comparisonRes.data || []).filter(o => o.status === 'cancelled').length;

        // Deltas
        const revenueDelta = compRevenue > 0 ? ((totalRevenue - compRevenue) / compRevenue) * 100 : 0;
        const countDelta = ordersCount - compCount;
        const avgDelta = compAvg > 0 ? ((avgTicket - compAvg) / compAvg) * 100 : 0;

        // Hourly Distribution
        const hourlySales = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, total: 0, items: 0 }));
        let peakHour = 0;
        let maxHourRev = 0;
        let totalItems = 0;
        let maxSale = 0;

        completed.forEach(o => {
          const date = new Date(o.created_at);
          const hour = date.getHours();
          const itemsInOrder = o.order_items.reduce((sum: number, item: any) => sum + Number(item.qty), 0);
          
          hourlySales[hour].total += Number(o.total);
          hourlySales[hour].items += itemsInOrder;
          totalItems += itemsInOrder;
          
          if (Number(o.total) > maxSale) maxSale = Number(o.total);
          if (hourlySales[hour].total > maxHourRev) {
            maxHourRev = hourlySales[hour].total;
            peakHour = hour;
          }
        });

        // Payment Methods
        const paymentSplit: Record<string, { total: number, count: number }> = {
          'Efectivo': { total: 0, count: 0 },
          'Transferencias / QR': { total: 0, count: 0 },
          'Tarjeta': { total: 0, count: 0 }
        };

        completed.forEach(o => {
          let method = 'cash';
          let splitInfo: { cash: number; transfer: number } | null = null;
          
          if (o.payment && typeof o.payment === 'object') {
            const p = o.payment as any;
            method = p.method || p.type || 'cash';
            if (method === 'split' && p.details) {
              splitInfo = p.details;
            }
          }
          
          if (method === 'split' && splitInfo) {
            paymentSplit['Efectivo'].total += Number(splitInfo.cash || 0);
            paymentSplit['Efectivo'].count += 1;
            paymentSplit['Transferencias / QR'].total += Number(splitInfo.transfer || 0);
            paymentSplit['Transferencias / QR'].count += 1;
          } else {
            const formattedMethod = (method === 'cash' || method === 'efectivo') ? 'Efectivo' : 
                                  (method === 'card' || method === 'tarjeta') ? 'Tarjeta' : 
                                  (method === 'transfer' || method === 'nequi' || method === 'qr') ? 'Transferencias / QR' : 'Efectivo';
            
            if (!paymentSplit[formattedMethod]) paymentSplit[formattedMethod] = { total: 0, count: 0 };
            paymentSplit[formattedMethod].total += Number(o.total);
            paymentSplit[formattedMethod].count += 1;
          }
        });

        const pieData = Object.entries(paymentSplit).map(([name, data]) => ({
          name, value: data.total, count: data.count, percentage: totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 100) : 0
        })).filter(d => d.value > 0);

        // Popular Products
        const productMap: Record<string, { sales: number, revenue: number }> = {};
        completed.forEach(o => {
          o.order_items.forEach((item: any) => {
            if (!productMap[item.name]) productMap[item.name] = { sales: 0, revenue: 0 };
            productMap[item.name].sales += Number(item.qty);
            productMap[item.name].revenue += Number(item.price) * Number(item.qty);
          });
        });

        const sortedProducts = Object.entries(productMap)
          .map(([name, data]) => ({ name, sales: data.sales, revenue: data.revenue }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

        const inventoryData = inventoryRes.data || [];
        const sizesData = (await supabase.from("sizes").select("name, multiplier").eq("store_id", storeId)).data || [];
        
        const lowStock = inventoryData.filter(item => item.stock <= (item.min_stock || 0) || item.is_mixture);

        return {
          metrics: {
            revenue: { val: totalRevenue, delta: revenueDelta },
            orders: { val: ordersCount, delta: countDelta },
            avgTicket: { val: avgTicket, delta: avgDelta },
            cancelled: { val: cancelledCount, comp: compCancelled }
          },
          recentOrders: orders.slice(0, 5),
          hourlySales: hourlySales.slice(8, 24), 
          peakHour: `${peakHour}:00 - ${peakHour + 1}:00`,
          maxSale,
          totalItems,
          pieData,
          popularProducts: sortedProducts,
          lowStock,
          sizes: sizesData
        };
      } catch (err) {
        throw err;
      }
    },
    enabled: !!storeId,
    refetchInterval: 30000,
  });

  const comparisonLabel = period === 'today' ? 'ayer' : (period === 'week' ? 'sem. pasada' : (period === 'month' ? 'mes pasado' : 'año pasado'));

  if (isLoading && !dashboardData) {
    return (
      <Layout>
        <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center bg-background text-foreground">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-bold animate-pulse">Sincronizando datos del negocio...</p>
        </div>
      </Layout>
    );
  }

  if (queryError) {
    return (
      <Layout>
        <div className="flex h-[calc(100vh-64px)] items-center justify-center p-10 font-poppins">
           <Card className="bg-destructive/10 border-destructive/20 p-8 text-center max-w-md rounded-[2.5rem] shadow-2xl">
              <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </div>
              <CardTitle className="text-foreground text-2xl font-black mb-2">Error de Sincronización</CardTitle>
              <CardDescription className="text-red-400 font-medium mb-6">
                {(queryError as any)?.message || (queryError as any)?.details || JSON.stringify(queryError)}
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
      <div className="min-h-screen p-2 md:p-4 lg:p-6 space-y-10 animate-pro-in">
        {/* Header - Bento Style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/50 relative">
          <div className="absolute -left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full shadow-glow-pro" />
          <div className="animate-pro-in">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-2">
              INTELIGENCIA <span className="text-primary text-glow italic">DE NEGOCIO</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-space-grotesk italic">
               Sincronización v2.0 • {format(new Date(), "eeee d MMM yyyy", { locale: es })}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1.5 glass-pro rounded-[1.5rem] self-start border-border overflow-x-auto no-scrollbar max-w-full">
            {(['today', 'week', 'month', 'year'] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                className={cn(
                  "px-6 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
                  period === p 
                    ? "bg-primary text-primary-foreground shadow-glow-pro scale-105" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
                onClick={() => setPeriod(p)}
              >
                {p === 'today' ? 'Hoy' : (p === 'week' ? 'Semana' : (p === 'month' ? 'Mes' : 'Año'))}
              </Button>
            ))}
          </div>
        </div>

        {/* Bento Grid Body */}
        <div className="bento-grid">
            {/* Main Stats - Bento Wide */}
            <div className="md:col-span-2 lg:col-span-4 dim-layering">
                <StatCards data={dashboardData} label={comparisonLabel} />
            </div>

            {/* Sales Chart - Bento Large */}
            <div className="bento-item-large dim-layering group">
                <div className="h-full glass-pro rounded-[2.5rem] p-1 border-border/50 hover:border-primary/30 transition-all duration-700">
                    <SalesChartWidget data={dashboardData} />
                </div>
            </div>

            {/* Payment Split - Bento Tall */}
            <div className="bento-item-tall dim-layering group">
                <div className="h-full glass-pro rounded-[2.5rem] p-1 border-border/50 hover:border-primary/30 transition-all duration-700">
                    <PaymentMethodsWidget data={dashboardData} />
                </div>
            </div>

            {/* Mixture Status - Bento Normal */}
            <div className="dim-layering group">
                <div className="h-full glass-pro rounded-[2.5rem] p-1 border-border/50 hover:border-primary/30 transition-all duration-700">
                    <MixtureStockWidget data={dashboardData} />
                </div>
            </div>

            {/* Popular Products - Bento Normal */}
            <div className="dim-layering group">
                <div className="h-full glass-pro rounded-[2.5rem] p-1 border-border/50 hover:border-primary/30 transition-all duration-700">
                    <PopularProductsWidget data={dashboardData} />
                </div>
            </div>

            {/* Recent Sales - Bento Wide */}
            <div className="bento-item-wide dim-layering group">
                <div className="h-full glass-pro rounded-[2.5rem] p-1 border-white/5 hover:border-primary/30 transition-all duration-700">
                    <RecentSalesWidget data={dashboardData} />
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}

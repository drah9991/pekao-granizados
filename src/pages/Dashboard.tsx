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
          (supabase as any).from("inventory_items").select("name, stock, min_stock").eq("store_id", storeId)
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

        const popularProducts = Object.entries(productMap)
          .map(([name, data]) => ({ name, sales: data.sales, revenue: data.revenue }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

        const lowStockItems = (inventoryRes.data || []).filter(item => item.stock <= (item.min_stock || 0));

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
          popularProducts,
          lowStock: lowStockItems
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
        <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center bg-[#0F1117] text-white">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-slate-400 font-bold animate-pulse">Sincronizando datos del negocio...</p>
        </div>
      </Layout>
    );
  }

  if (queryError) {
    return (
      <Layout>
        <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-[#0F1117] p-10 font-poppins">
           <Card className="bg-red-500/10 border-red-500/20 p-8 text-center max-w-md rounded-[2.5rem] shadow-2xl">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <CardTitle className="text-white text-2xl font-black mb-2">Error de Sincronización</CardTitle>
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
      <div className="min-h-screen bg-[#0F1117] text-white p-6 lg:p-10 space-y-8 animate-in fade-in duration-700 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Resumen del negocio
            </h1>
            <p className="text-slate-400 font-medium">
              Dashboard sincronizado • {format(new Date(), "eeee d MMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>

          <div className="flex items-center bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 backdrop-blur-xl shadow-inner self-start">
            {(['today', 'week', 'month', 'year'] as const).map((p) => (
              <Button
                key={p}
                variant="ghost"
                className={cn(
                  "px-6 h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                  period === p ? "bg-primary text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:text-white" : "text-slate-500 hover:text-white"
                )}
                onClick={() => setPeriod(p)}
              >
                {p === 'today' ? 'Hoy' : (p === 'week' ? 'Semana' : (p === 'month' ? 'Mes' : 'Año'))}
              </Button>
            ))}
          </div>
        </div>

        {/* Dashboard Widgets Refactored */}
        <StatCards data={dashboardData} label={comparisonLabel} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SalesChartWidget data={dashboardData} />
          <PaymentMethodsWidget data={dashboardData} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <RecentSalesWidget data={dashboardData} />
          <PopularProductsWidget data={dashboardData} />
        </div>
      </div>
    </Layout>
  );
}

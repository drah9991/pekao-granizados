import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  ShoppingBag, 
  Tag, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2, 
  Circle,
  PieChart as PieChartIcon,
  ShoppingBasket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useState, useMemo, useEffect } from "react";
import { 
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, startOfYear, endOfYear, 
  format, isSameDay, subWeeks, subMonths, subYears
} from "date-fns";
import { es } from "date-fns/locale";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Custom Currency Formatter
const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Dashboard() {
  const { storeId, user } = useAuth();
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today");

  // Debugging: Log storeId to see if it's arriving
  useEffect(() => {
    console.log("Dashboard mount - StoreID:", storeId, "User:", user?.id);
  }, [storeId, user]);

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
        console.warn("Query skipped: No storeId");
        return null;
      }

      console.log(`Fetching dashboard data for store ${storeId} and period ${period}`);
      console.log("Date Range:", ranges.current);

      try {
        const [currentRes, comparisonRes, inventoryRes] = await Promise.all([
          supabase.from("orders").select("id, total, subtotal, tip_amount, delivery_fee, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end),
          supabase.from("orders").select("total, status").eq("store_id", storeId).gte("created_at", ranges.comparison.start).lte("created_at", ranges.comparison.end),
          (supabase as any).from("inventory_items").select("name, stock, min_stock").eq("store_id", storeId)
        ]);

        if (currentRes.error) {
          console.error("Current Orders Error:", currentRes.error);
          // Fallback if delivery_fee still missing
          if (currentRes.error.message?.includes("delivery_fee")) {
            const fallback = await supabase.from("orders").select("id, total, subtotal, tip_amount, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end);
            if (fallback.error) throw fallback.error;
            currentRes.data = fallback.data as any;
          } else {
            throw currentRes.error;
          }
        }
        if (comparisonRes.error) {
          console.error("Comparison Orders Error:", comparisonRes.error);
          throw comparisonRes.error;
        }
        if (inventoryRes.error) {
          console.error("Inventory Error:", inventoryRes.error);
          throw inventoryRes.error;
        }
        
        // Final dataset for analysis
        const orders = (currentRes?.data as any[]) || [];
      const completed = orders.filter(o => o.status === 'completed');
      const cancelled = orders.filter(o => o.status === 'cancelled');

      // Current Metrics
      const totalRevenue = completed.reduce((sum, o) => sum + (Number(o.total || 0) - Number(o.tip_amount || 0)), 0);
      const ordersCount = completed.length;
      const cancelledCount = cancelled.length;
      const avgTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

      // Comparison Metrics
      const compOrders = (comparisonRes.data || []).filter(o => o.status === 'completed');
      const compRevenue = compOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const compCount = compOrders.length;
      const compAvg = compCount > 0 ? compRevenue / compCount : 0;
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

      // Payment Methods (Audit Sync: Efectivo vs Transferencias)
      const paymentSplit: Record<string, { total: number, count: number }> = {
        'Efectivo': { total: 0, count: 0 },
        'Transferencias / QR': { total: 0, count: 0 },
        'Tarjeta': { total: 0, count: 0 }
      };

      completed.forEach(o => {
        let method = 'cash'; // default
        let splitInfo: { cash: number; transfer: number } | null = null;
        
        if (o.payment && typeof o.payment === 'object') {
          const p = o.payment as any;
          method = p.method || p.type || 'cash';
          if (method === 'split' && p.details) {
            splitInfo = p.details;
          }
        }
        
        // Split logic: Divide amount between categories
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
        name,
        value: data.total,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 100) : 0
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

      // Low Stock Logic properly filtered in JS
      const lowStockItems = (inventoryRes.data || []).filter(item => 
        item.stock <= (item.min_stock || 0)
      );

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
        console.error("Dashboard Fetch Error:", err);
        throw err;
      }
    },
    enabled: !!storeId,
    refetchInterval: 30000, // Sync every 30 seconds
  });

  const getEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("fresa")) return "🍓";
    if (n.includes("sandía") || n.includes("sandia")) return "🍉";
    if (n.includes("mango")) return "🥭";
    if (n.includes("uva")) return "🍇";
    return "🥤";
  };

  const comparisonLabel = period === 'today' ? 'ayer' : (period === 'week' ? 'semana pas.' : (period === 'month' ? 'mes pas.' : 'año pas.'));

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
              <div className="p-4 bg-black/40 rounded-2xl text-[10px] text-left font-mono text-red-300/60 mb-6 overflow-hidden">
                Query: dashboard-v2-sync<br/>
                StoreID: {storeId || "null"}<br/>
                Period: {period}
              </div>
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
      <div className="min-h-screen bg-[#0F1117] text-white p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
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
                  period === p ? "bg-primary text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]" : "text-slate-500 hover:text-white"
                )}
                onClick={() => setPeriod(p)}
              >
                {p === 'today' ? 'Hoy' : (p === 'week' ? 'Semana' : (p === 'month' ? 'Mes' : 'Año'))}
              </Button>
            ))}
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ingresos Totales</span>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-[1rem] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{formatMoney(dashboardData?.metrics.revenue.val || 0)}</div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black",
                  dashboardData?.metrics.revenue.delta! >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>
                  {dashboardData?.metrics.revenue.delta! >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(Math.round(dashboardData?.metrics.revenue.delta!))}%
                </div>
                <span className="text-[10px] items-center gap-1 uppercase font-bold text-slate-500">vs {comparisonLabel}</span>
              </div>
            </CardContent>
          </Card>

          {/* Orders */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Órdenes</span>
              <div className="w-10 h-10 bg-indigo-500/10 rounded-[1rem] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{dashboardData?.metrics.orders.val}</div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black",
                  dashboardData?.metrics.orders.delta! >= 0 ? "bg-indigo-500/10 text-indigo-500" : "bg-red-500/10 text-red-500"
                )}>
                  {dashboardData?.metrics.orders.delta! >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(dashboardData?.metrics.orders.delta!)}
                </div>
                <span className="text-[10px] items-center gap-1 uppercase font-bold text-slate-500">vs {comparisonLabel}</span>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Promedio */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-teal-500/0 via-teal-500/40 to-teal-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ticket Promedio</span>
              <div className="w-10 h-10 bg-teal-500/10 rounded-[1rem] flex items-center justify-center">
                <Tag className="w-5 h-5 text-teal-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{formatMoney(dashboardData?.metrics.avgTicket.val || 0)}</div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black",
                  dashboardData?.metrics.avgTicket.delta! >= 0 ? "bg-teal-500/10 text-teal-500" : "bg-red-500/10 text-red-500"
                )}>
                  {dashboardData?.metrics.avgTicket.delta! >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(Math.round(dashboardData?.metrics.avgTicket.delta!))}%
                </div>
                <span className="text-[10px] items-center gap-1 uppercase font-bold text-slate-500">vs {comparisonLabel}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cancelations */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cancelaciones</span>
              <div className="w-10 h-10 bg-red-500/10 rounded-[1rem] flex items-center justify-center">
                <Circle className="w-5 h-5 text-red-500 fill-red-500/20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{dashboardData?.metrics.cancelled.val}</div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  Perdida de {formatMoney(dashboardData?.metrics.cancelled.val! * (dashboardData?.metrics.avgTicket.val || 10000))} aprox.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hourly chart */}
          <Card className="lg:col-span-2 bg-[#1C1F26] border-none rounded-[3.5rem] p-10 shadow-2xl border-t border-white/5">
            <div className="flex items-center justify-between mb-10">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight mb-1">Ingresos por hora</CardTitle>
                <CardDescription className="text-slate-400 font-medium tracking-wide">Actividad detectada en tiempo real</CardDescription>
              </div>
              <div className="p-1 px-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                En Vivo
              </div>
            </div>

            <div className="h-[280px] w-full mb-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardData?.hourlySales}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F1117', border: '1px solid #ffffff10', borderRadius: '24px', padding: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '14px' }}
                    formatter={(val: number) => [formatMoney(val), "Ingresos"]}
                    labelStyle={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '10px', marginBottom: '8px' }}
                    cursor={{ stroke: '#10B981', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10B981" 
                    strokeWidth={5}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
              <div className="space-y-1">
                <p className="text-[10px] items-center gap-1 uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Hora pico</p>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <p className="text-lg font-black text-white">{dashboardData?.peakHour}</p>
                </div>
              </div>
              <div className="space-y-1 border-x border-white/5 px-6 text-center">
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Venta Máxima</p>
                <p className="text-xl font-black text-white">{formatMoney(dashboardData?.maxSale || 0)}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-2">Total Ítems</p>
                <p className="text-xl font-black text-emerald-500">{dashboardData?.totalItems} und</p>
              </div>
            </div>
          </Card>

          {/* Payment methods Donut */}
          <Card className="bg-[#1C1F26] border-none rounded-[3.5rem] p-10 shadow-2xl flex flex-col border-t border-white/5">
            <div className="mb-8">
              <CardTitle className="text-2xl font-black tracking-tight mb-1">Caja hoy</CardTitle>
              <CardDescription className="text-slate-400 font-medium tracking-wide">Métodos de recaudo</CardDescription>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative py-6">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-4">
                 <div className="text-center">
                    <p className="text-4xl font-black tracking-tighter">{dashboardData?.metrics.orders.val}</p>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Ventas</p>
                 </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData?.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={105}
                      paddingAngle={8}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {dashboardData?.pieData.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === 'Efectivo' ? '#10B981' : (entry.name === 'Tarjeta' ? '#4F46E5' : '#06B6D4')} 
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F1117', border: '1px solid #ffffff10', borderRadius: '20px' }}
                      itemStyle={{ color: '#fff', fontWeight: 800 }}
                      formatter={(val: number) => formatMoney(val)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-5 pt-8 border-t border-white/5 mt-auto">
              {dashboardData?.pieData.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full shadow-lg",
                      item.name === 'Efectivo' ? 'bg-emerald-500 shadow-emerald-500/20' : (item.name === 'Tarjeta' ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-cyan-500 shadow-cyan-500/20')
                    )} />
                    <span className="text-sm font-black text-slate-300">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">{formatMoney(item.value)}</p>
                    <p className="text-[10px] font-bold text-slate-500">{item.percentage}%</p>
                  </div>
                </div>
              ))}
              
              <div className="pt-6 border-t border-white/5 mt-6">
                  <div className="flex items-center justify-between">
                     <p className="text-[11px] font-black uppercase text-slate-500 tracking-[0.1em]">Ticket Promesa</p>
                     <p className="text-lg font-black text-primary">{formatMoney(dashboardData?.metrics.avgTicket.val || 0)}</p>
                  </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Recent Sales Table */}
          <Card className="lg:col-span-3 bg-[#1C1F26] border-none rounded-[3.5rem] p-10 shadow-2xl border-t border-white/5 overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight mb-1">Últimas Ventas</CardTitle>
                <CardDescription className="text-slate-400 font-medium tracking-wide">Registro cronológico de ingresos</CardDescription>
              </div>
              <Button variant="ghost" className="text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/10 rounded-xl px-6">
                Ver Historial
              </Button>
            </div>

            <div className="overflow-x-auto -mx-10 px-10">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="pb-6">ID Pedido</th>
                    <th className="pb-6">Hora</th>
                    <th className="pb-6 text-center">Ítems</th>
                    <th className="pb-6">Método</th>
                    <th className="pb-6">Estado</th>
                    <th className="pb-6 text-right">Monto Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {dashboardData?.recentOrders.map((order: any) => (
                    <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-6 text-xs font-black text-slate-400 group-hover:text-white">#{order.id.slice(0, 8)}</td>
                      <td className="py-6 text-xs font-bold text-slate-300">{format(new Date(order.created_at), 'HH:mm')}</td>
                      <td className="py-6 text-xs font-black text-slate-300 text-center">
                        <Badge variant="outline" className="border-white/10 text-[10px] rounded-lg">
                          {order.order_items.reduce((sum: number, i: any) => sum + i.qty, 0)}
                        </Badge>
                      </td>
                      <td className="py-6">
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-tighter bg-white/5 px-2 py-1 rounded-md">
                          {order.payment?.method === 'cash' ? 'Efectivo' : (order.payment?.method === 'card' ? 'Tarjeta' : (order.payment?.method === 'transfer' ? 'Nequi' : 'Efectivo'))}
                        </span>
                      </td>
                      <td className="py-6">
                        <div className={cn(
                          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight",
                          order.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-red-500/10 text-red-500"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", order.status === 'completed' ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                          {order.status === 'completed' ? 'Completado' : 'Cancelado'}
                        </div>
                      </td>
                      <td className={cn(
                        "py-6 text-right font-black text-lg tabular-nums",
                        order.status === 'cancelled' ? "text-slate-600 line-through" : "text-white"
                      )}>
                        {formatMoney(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Popular Products Ranking */}
          <Card className="lg:col-span-2 bg-[#1C1F26] border-none rounded-[3.5rem] p-10 shadow-2xl border-t border-white/5">
            <div className="flex items-center justify-between mb-10">
              <div>
                <CardTitle className="text-2xl font-black tracking-tight mb-1">Top Ventas</CardTitle>
                <CardDescription className="text-slate-400 font-medium tracking-wide">Preferencias del cliente</CardDescription>
              </div>
            </div>

            <div className="space-y-8">
              {dashboardData?.popularProducts.map((p: any, idx: number) => (
                <div key={idx} className="flex items-center gap-5 group">
                  <div className="relative">
                    <span className="absolute -top-2 -left-2 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10 z-10 shadow-lg">
                      {idx + 1}
                    </span>
                    <div className="text-4xl bg-white/5 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110 duration-500">
                      {getEmoji(p.name)}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black truncate max-w-[120px]">{p.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 tracking-[0.1em] uppercase group-hover:text-primary transition-colors">Best Seller</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-white">{p.sales} und</p>
                        <p className="text-[10px] font-bold text-emerald-500">{formatMoney(p.revenue)}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden p-[1px]">
                       <div 
                         className={cn(
                           "h-full rounded-full transition-all duration-1000",
                           idx === 0 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" : (idx === 1 ? "bg-cyan-500" : "bg-teal-500")
                         )} 
                         style={{ width: `${(p.sales / dashboardData.popularProducts[0].sales) * 100}%` }}
                       />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* UI Fix: Better Alert integration */}
            {dashboardData?.lowStock && dashboardData.lowStock.length > 0 && (
               <div className="mt-12 p-6 bg-orange-500/10 border border-orange-500/20 rounded-[2.5rem] flex items-center gap-4 animate-bounce-subtle">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center shrink-0">
                     <AlertTriangle className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Stock bajo crítico</p>
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-tighter">
                      {dashboardData.lowStock[0].name}: {dashboardData.lowStock[0].stock} und
                    </p>
                  </div>
               </div>
            )}
            
            {dashboardData?.popularProducts.length === 0 && (
              <div className="py-20 text-center opacity-30">
                 <ShoppingBasket className="w-16 h-16 mx-auto mb-4" />
                 <p className="text-sm font-bold">Sin datos de productos</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}

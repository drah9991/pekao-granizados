import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingBag, Users, ArrowUpRight, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, endOfDay } from "date-fns";

export default function Dashboard() {
  const { storeId } = useAuth();

  // 1. Fetch Today's Stats
  const { data: todayStats, isLoading: isLoadingToday } = useQuery({
    queryKey: ["dashboard-today", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      const { data, error } = await supabase
        .from("orders")
        .select("total")
        .eq("store_id", storeId)
        .gte("created_at", start)
        .lte("created_at", end);

      if (error) throw error;

      const totalSales = data.reduce((sum, order) => sum + Number(order.total), 0);
      const totalOrders = data.length;

      return { totalSales, totalOrders };
    },
    enabled: !!storeId,
  });

  // 2. Fetch Global Stats
  const { data: globalStats, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ["dashboard-global", storeId],
    queryFn: async () => {
      if (!storeId) return null;

      const [productsRes, customersRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
        supabase.from("customers").select("id", { count: "exact", head: true })
      ]);

      return {
        products: productsRes.count || 0,
        customers: customersRes.count || 0
      };
    },
    enabled: !!storeId,
  });

  // 3. Fetch Recent Sales
  const { data: recentSales, isLoading: isLoadingRecent } = useQuery({
    queryKey: ["dashboard-recent-sales", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          total,
          created_at,
          order_items (qty)
        `)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!storeId,
  });

  // 4. Fetch Popular Products
  const { data: popularProducts, isLoading: isLoadingPopular } = useQuery({
    queryKey: ["dashboard-popular-products", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      
      // Since we don't have a complex aggregation query easily via Postgrest for "top 5",
      // we'll fetch recent order items and aggregate them in JS for simplicity in this MVP upgrade.
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          name,
          qty,
          order:order_id (store_id)
        `)
        .eq("order.store_id", storeId)
        .limit(50); // Take last 50 items to estimate popularity

      if (error) throw error;

      const aggregation: Record<string, number> = {};
      data.forEach(item => {
        aggregation[item.name] = (aggregation[item.name] || 0) + Number(item.qty);
      });

      return Object.entries(aggregation)
        .map(([name, sales]) => ({ name, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 4);
    },
    enabled: !!storeId,
  });

  const isLoading = isLoadingToday || isLoadingGlobal || isLoadingRecent || isLoadingPopular;

  const stats = [
    {
      title: "Ventas Hoy",
      value: formatCurrency(todayStats?.totalSales || 0),
      change: "+12.5%", // These could be calculated if we fetch yesterday's data too
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: "Pedidos",
      value: todayStats?.totalOrders.toString() || "0",
      change: "+8.2%",
      icon: ShoppingBag,
      color: "text-secondary",
    },
    {
      title: "Productos",
      value: globalStats?.products.toString() || "0",
      change: "+2",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Clientes",
      value: globalStats?.customers.toString() || "0",
      change: "+23",
      icon: Users,
      color: "text-primary",
    },
  ];

  const getEmoji = (name: string) => {
    if (name.toLowerCase().includes("fresa")) return "🍓";
    if (name.toLowerCase().includes("limón")) return "🍋";
    if (name.toLowerCase().includes("mango")) return "🥭";
    if (name.toLowerCase().includes("frambuesa")) return "🫐";
    return "🥤";
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Resumen de tu negocio en tiempo real</p>
          </div>
          {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="relative overflow-hidden border-2 shadow-card transition-smooth hover:shadow-elevated hover:-translate-y-1 cursor-pointer group"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-smooth ${
                index === 0 ? 'gradient-primary' : 
                index === 1 ? 'gradient-secondary' : 
                index === 2 ? 'gradient-accent' : 'gradient-primary'
              }`} />
              <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2.5 rounded-xl ${stat.color} bg-opacity-10 ${
                  index === 0 ? 'bg-primary/10' : 
                  index === 1 ? 'bg-secondary/10' : 
                  index === 2 ? 'bg-accent/10' : 'bg-primary/10'
                }`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl md:text-4xl font-bold mb-2">{stat.value}</div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4 text-accent" />
                  <p className="text-xs md:text-sm text-accent font-semibold">{stat.change} desde ayer</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card className="border-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Ventas Recientes</CardTitle>
              <CardDescription className="text-sm">Últimas transacciones realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSales?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No hay ventas registradas hoy.</p>
                )}
                {recentSales?.map((order, i) => (
                  <div 
                    key={order.id} 
                    className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-smooth border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full gradient-primary flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm md:text-base">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {new Date(order.created_at || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg md:text-xl text-primary">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(order.order_items) ? order.order_items.reduce((acc: number, item: any) => acc + Number(item.qty), 0) : 0} items
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Productos Populares</CardTitle>
              <CardDescription className="text-sm">Más vendidos recientemente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {popularProducts?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No hay datos de productos populares.</p>
                )}
                {popularProducts?.map((product, i) => (
                  <div key={product.name} className="flex items-center gap-3 md:gap-4 py-2">
                    <div className="text-2xl md:text-3xl">{getEmoji(product.name)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm md:text-base">{product.name}</p>
                        <p className="text-xs md:text-sm font-bold text-muted-foreground">{product.sales} unidades</p>
                      </div>
                      <div className="relative w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-smooth ${
                            i === 0 ? 'gradient-primary' : 
                            i === 1 ? 'gradient-secondary' : 
                            i === 2 ? 'gradient-accent' : 'gradient-primary'
                          }`}
                          style={{ width: `${Math.min(100, (product.sales / (popularProducts[0]?.sales || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

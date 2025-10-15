import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingBag, Users } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Ventas Hoy",
      value: "$2,450",
      change: "+12.5%",
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: "Pedidos",
      value: "145",
      change: "+8.2%",
      icon: ShoppingBag,
      color: "text-secondary",
    },
    {
      title: "Productos",
      value: "32",
      change: "+2",
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      title: "Clientes",
      value: "1,234",
      change: "+23",
      icon: Users,
      color: "text-primary",
    },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Resumen de tu negocio en tiempo real</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className="glass-card shadow-card transition-smooth hover:shadow-elevated">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <p className="text-xs text-accent font-medium">{stat.change} desde ayer</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card shadow-card">
            <CardHeader>
              <CardTitle>Ventas Recientes</CardTitle>
              <CardDescription>Últimas transacciones del día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium">Pedido #{1000 + i}</p>
                      <p className="text-sm text-muted-foreground">Hace {i * 5} minutos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">${(15 + i * 8).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">2 items</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-card">
            <CardHeader>
              <CardTitle>Productos Populares</CardTitle>
              <CardDescription>Más vendidos esta semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Granizado Fresa", sales: 145 },
                  { name: "Granizado Limón", sales: 132 },
                  { name: "Granizado Frambuesa", sales: 98 },
                  { name: "Granizado Mango", sales: 87 },
                ].map((product, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sales} unidades</p>
                    </div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full gradient-primary rounded-full" 
                        style={{ width: `${(product.sales / 145) * 100}%` }}
                      />
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

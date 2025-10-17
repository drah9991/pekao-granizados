import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingBag, Users, ArrowUpRight } from "lucide-react";

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
      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Resumen de tu negocio en tiempo real</p>
          </div>
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
              <CardDescription className="text-sm">Últimas transacciones del día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 md:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-smooth border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full gradient-primary flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm md:text-base">Pedido #{1000 + i}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">Hace {i * 5} minutos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg md:text-xl text-primary">${(15 + i * 8).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">2 items</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 shadow-card">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl">Productos Populares</CardTitle>
              <CardDescription className="text-sm">Más vendidos esta semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Granizado Fresa", sales: 145, emoji: "🍓" },
                  { name: "Granizado Limón", sales: 132, emoji: "🍋" },
                  { name: "Granizado Frambuesa", sales: 98, emoji: "🫐" },
                  { name: "Granizado Mango", sales: 87, emoji: "🥭" },
                ].map((product, i) => (
                  <div key={i} className="flex items-center gap-3 md:gap-4 py-2">
                    <div className="text-2xl md:text-3xl">{product.emoji}</div>
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
                          style={{ width: `${(product.sales / 145) * 100}%` }}
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

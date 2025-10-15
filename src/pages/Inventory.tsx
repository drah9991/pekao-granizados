import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

const inventoryData = [
  { 
    id: "1", 
    product: "Granizado Fresa", 
    stock: 45, 
    minStock: 20, 
    trend: "up",
    lastUpdate: "Hace 2 horas",
    tienda: "Centro"
  },
  { 
    id: "2", 
    product: "Granizado Limón", 
    stock: 38, 
    minStock: 20, 
    trend: "down",
    lastUpdate: "Hace 1 hora",
    tienda: "Centro"
  },
  { 
    id: "3", 
    product: "Granizado Mango", 
    stock: 15, 
    minStock: 20, 
    trend: "down",
    lastUpdate: "Hace 30 min",
    tienda: "Norte"
  },
  { 
    id: "4", 
    product: "Granizado Cola", 
    stock: 5, 
    minStock: 20, 
    trend: "down",
    lastUpdate: "Hace 10 min",
    tienda: "Sur"
  },
];

const lowStockItems = inventoryData.filter(item => item.stock < item.minStock);

export default function Inventory() {
  return (
    <Layout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Inventario</h1>
          <p className="text-muted-foreground">Control de stock por tienda</p>
        </div>

        {/* Alert Cards */}
        {lowStockItems.length > 0 && (
          <Card className="glass-card border-destructive/50 shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <CardTitle className="text-destructive">Stock Bajo</CardTitle>
              </div>
              <CardDescription>
                {lowStockItems.length} productos requieren reabastecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                    <div>
                      <p className="font-medium">{item.product}</p>
                      <p className="text-sm text-muted-foreground">{item.tienda}</p>
                    </div>
                    <Badge variant="destructive">{item.stock} uds</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stock Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold mb-1">247</div>
                  <p className="text-xs text-muted-foreground">unidades</p>
                </div>
                <Package className="w-10 h-10 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Productos Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold mb-1">32</div>
                  <p className="text-xs text-accent font-medium">+2 esta semana</p>
                </div>
                <TrendingUp className="w-10 h-10 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stock Bajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold mb-1 text-destructive">{lowStockItems.length}</div>
                  <p className="text-xs text-muted-foreground">requieren atención</p>
                </div>
                <TrendingDown className="w-10 h-10 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Inventario por Tienda</CardTitle>
            <CardDescription>Estado actual de todos los productos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inventoryData.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/5 transition-smooth">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{item.product}</h3>
                      <Badge variant="outline" className="text-xs">{item.tienda}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.lastUpdate}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Stock</p>
                      <p className={`font-bold text-lg ${item.stock < item.minStock ? "text-destructive" : "text-foreground"}`}>
                        {item.stock}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
                      <p className="font-medium text-muted-foreground">{item.minStock}</p>
                    </div>

                    {item.trend === "up" ? (
                      <TrendingUp className="w-5 h-5 text-accent" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    )}

                    <Button variant="outline" size="sm">
                      Ajustar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

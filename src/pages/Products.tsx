import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const products = [
  { id: "1", name: "Granizado Fresa", price: 3.5, category: "Clásicos", stock: 45, status: "active" },
  { id: "2", name: "Granizado Limón", price: 3.5, category: "Clásicos", stock: 38, status: "active" },
  { id: "3", name: "Granizado Frambuesa", price: 4.0, category: "Premium", stock: 22, status: "active" },
  { id: "4", name: "Granizado Mango", price: 4.0, category: "Premium", stock: 15, status: "low" },
  { id: "5", name: "Granizado Mix", price: 4.5, category: "Especiales", stock: 30, status: "active" },
  { id: "6", name: "Granizado Cola", price: 3.5, category: "Clásicos", stock: 5, status: "low" },
  { id: "7", name: "Granizado Piña", price: 3.5, category: "Clásicos", stock: 42, status: "active" },
  { id: "8", name: "Granizado Uva", price: 4.0, category: "Premium", stock: 28, status: "active" },
];

export default function Products() {
  return (
    <Layout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Catálogo de Productos</h1>
            <p className="text-muted-foreground">Gestiona tu inventario de productos</p>
          </div>
          <Button className="shadow-card">
            <Plus className="mr-2" />
            Nuevo Producto
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input placeholder="Buscar productos..." className="pl-10" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="glass-card shadow-card transition-smooth hover:shadow-elevated group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant={product.status === "low" ? "destructive" : "secondary"}>
                    {product.category}
                  </Badge>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => toast.info("Editar producto")}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => toast.error("Eliminar producto")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-2">{product.name}</h3>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-primary">
                    ${product.price.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Stock</span>
                  <span className={`font-bold ${product.status === "low" ? "text-destructive" : "text-foreground"}`}>
                    {product.stock} uds
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { Tables, Enums } from "@/integrations/supabase/types";
import React from "react";

type Product = Tables<'products'>;
type ProductType = Enums<'product_type'>;

interface StockInfo {
  store_name: string;
  qty: number;
  min_qty: number;
}

const productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[] = [
  { value: "granizado", label: "Granizado", icon: Package }, // Default icon
  { value: "topping", label: "Topping", icon: Package },
  { value: "sachet", label: "Sachet", icon: Package },
  { value: "sweet", label: "Dulce", icon: Package },
];

interface ProductDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  viewingProduct: Product | null;
  productStock: StockInfo[];
}

export default function ProductDetailsDialog({
  isOpen,
  onClose,
  viewingProduct,
  productStock,
}: ProductDetailsDialogProps) {
  if (!viewingProduct) return null;

  const ProductIcon = productTypeOptions.find(opt => opt.value === viewingProduct.type)?.icon || Package;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Detalles del Producto
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="stock">Stock por Tienda</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Nombre</Label>
                <p className="text-lg font-semibold">{viewingProduct.name}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Tipo</Label>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                    {ProductIcon && (
                      <ProductIcon className="w-3 h-3" />
                    )}
                    {productTypeOptions.find(opt => opt.value === viewingProduct.type)?.label || viewingProduct.type}
                  </Badge>
                </div>
              </div>

              {viewingProduct.category && (
                <div>
                  <Label className="text-muted-foreground">Categoría</Label>
                  <p className="font-mono">{viewingProduct.category}</p>
                </div>
              )}

              {viewingProduct.sku && (
                <div>
                  <Label className="text-muted-foreground">SKU</Label>
                  <p className="font-mono">{viewingProduct.sku}</p>
                </div>
              )}

              {viewingProduct.description && (
                <div>
                  <Label className="text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{viewingProduct.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Precio de Venta</Label>
                  <p className="text-2xl font-bold text-primary">
                    {formatCOP(viewingProduct.price)}
                  </p>
                </div>

                {viewingProduct.cost && (
                  <div>
                    <Label className="text-muted-foreground">Costo</Label>
                    <p className="text-2xl font-bold text-muted-foreground">
                      {formatCOP(viewingProduct.cost)}
                    </p>
                  </div>
                )}
              </div>

              {viewingProduct.cost && (
                <div className="p-4 bg-accent/10 rounded-lg">
                  <Label className="text-muted-foreground">Margen de Ganancia</Label>
                  <p className="text-2xl font-bold text-accent">
                    {formatCOP(viewingProduct.price - viewingProduct.cost)}
                    <span className="text-sm ml-2">
                      ({(((viewingProduct.price - viewingProduct.cost) / viewingProduct.price) * 100).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              )}

              <div>
                <Label className="text-muted-foreground">Estado</Label>
                <div className="mt-2">
                  <Badge variant={viewingProduct.active ? "default" : "secondary"}>
                    {viewingProduct.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Visibilidad</Label>
                <div className="mt-2">
                  <Badge variant={viewingProduct.is_public ? "default" : "secondary"}>
                    {viewingProduct.is_public ? "Público" : "Privado"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Fecha de Creación</Label>
                <p className="text-sm">{new Date(viewingProduct.created_at).toLocaleString('es')}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stock" className="space-y-4">
            {productStock.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No hay información de stock disponible
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {productStock.map((stock, index) => (
                  <Card key={index} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{stock.store_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Mínimo: {stock.min_qty} unidades
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            stock.qty < stock.min_qty ? 'text-destructive' : 'text-accent'
                          }`}>
                            {stock.qty}
                          </p>
                          <p className="text-xs text-muted-foreground">unidades</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
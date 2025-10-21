import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Package, TrendingDown, TrendingUp, AlertTriangle, Search, Filter, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StockItem {
  id: string;
  product_id: string;
  store_id: string;
  qty: number;
  min_qty: number;
  updated_at: string;
  product: {
    name: string;
    sku: string | null;
    price: number;
    cost: number | null;
    active: boolean;
  };
  store: {
    name: string;
  };
}

interface Store {
  id: string;
  name: string;
}

export default function Inventory() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Adjust stock dialog
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchStockData();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("Error fetching stores:", error);
      toast.error("Error al cargar tiendas");
      return;
    }

    setStores(data || []);
  };

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_stock")
        .select(`
          id,
          product_id,
          store_id,
          qty,
          min_qty,
          updated_at,
          products:product_id (
            name,
            sku,
            price,
            cost,
            active
          ),
          stores:store_id (
            name
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        id: item.id,
        product_id: item.product_id,
        store_id: item.store_id,
        qty: item.qty,
        min_qty: item.min_qty,
        updated_at: item.updated_at,
        product: Array.isArray(item.products) ? item.products[0] : item.products,
        store: Array.isArray(item.stores) ? item.stores[0] : item.stores,
      }));

      setStockItems(formattedData as StockItem[]);
    } catch (error: any) {
      console.error("Error fetching stock data:", error);
      toast.error("Error al cargar inventario");
    } finally {
      setLoading(false);
    }
  };

  const openAdjustDialog = (item: StockItem) => {
    setSelectedItem(item);
    setAdjustmentQty("");
    setAdjustmentReason("");
    setAdjustmentType("add");
    setAdjustDialog(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustmentQty || parseFloat(adjustmentQty) <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    const qty = parseFloat(adjustmentQty);
    const newQty = adjustmentType === "add" 
      ? selectedItem.qty + qty 
      : Math.max(0, selectedItem.qty - qty);

    setIsProcessing(true);

    try {
      // Update stock
      const { error: stockError } = await supabase
        .from("store_stock")
        .update({ qty: newQty, updated_at: new Date().toISOString() })
        .eq("id", selectedItem.id);

      if (stockError) throw stockError;

      // Record movement
      const { error: movementError } = await supabase
        .from("movements")
        .insert({
          product_id: selectedItem.product_id,
          store_id: selectedItem.store_id,
          qty: adjustmentType === "add" ? qty : -qty,
          type: adjustmentType === "add" ? "entry" : "exit",
          reason: adjustmentReason || `Ajuste manual (${adjustmentType === "add" ? "entrada" : "salida"})`,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (movementError) throw movementError;

      toast.success("Stock actualizado correctamente");
      setAdjustDialog(false);
      fetchStockData();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast.error("Error al ajustar stock: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredItems = stockItems.filter(item => {
    const matchesStore = selectedStore === "all" || item.store_id === selectedStore;
    const matchesSearch = !searchQuery || 
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.store.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLowStock = !filterLowStock || item.qty < item.min_qty;
    
    return matchesStore && matchesSearch && matchesLowStock;
  });

  const lowStockItems = stockItems.filter(item => item.qty < item.min_qty);
  const totalStock = stockItems.reduce((sum, item) => sum + item.qty, 0);
  const activeProducts = new Set(stockItems.map(item => item.product_id)).size;

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
            Inventario
          </h1>
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/10">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{item.store.name}</Badge>
                        {item.product.sku && (
                          <Badge variant="secondary" className="text-xs">SKU: {item.product.sku}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="mb-2">{item.qty} uds</Badge>
                      <p className="text-xs text-muted-foreground">Mín: {item.min_qty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stock Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold mb-1">{totalStock}</div>
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
                  <div className="text-3xl font-bold mb-1">{activeProducts}</div>
                  <p className="text-xs text-accent font-medium">productos únicos</p>
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

        {/* Filters and Search */}
        <Card className="glass-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por producto, SKU o tienda..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Todas las tiendas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las tiendas</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant={filterLowStock ? "default" : "outline"}
                onClick={() => setFilterLowStock(!filterLowStock)}
                className="w-full md:w-auto"
              >
                <Filter className="w-4 h-4 mr-2" />
                Solo Stock Bajo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Inventario por Tienda</CardTitle>
            <CardDescription>
              {filteredItems.length} productos • Estado actual de todos los productos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando inventario...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No se encontraron productos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const isLowStock = item.qty < item.min_qty;
                  const stockPercentage = (item.qty / item.min_qty) * 100;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl hover:bg-accent/5 transition-smooth ${
                        isLowStock ? 'border-destructive/30 bg-destructive/5' : 'border-border'
                      }`}
                    >
                      <div className="flex-1 mb-4 md:mb-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-base">{item.product.name}</h3>
                          <Badge variant="outline" className="text-xs">{item.store.name}</Badge>
                          {item.product.sku && (
                            <Badge variant="secondary" className="text-xs">
                              SKU: {item.product.sku}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Precio: ${item.product.price.toFixed(2)}</span>
                          {item.product.cost && (
                            <span>Costo: ${item.product.cost.toFixed(2)}</span>
                          )}
                          <span>Actualizado: {new Date(item.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 md:gap-6">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Stock Actual</p>
                          <p className={`font-bold text-2xl ${isLowStock ? "text-destructive" : "text-foreground"}`}>
                            {item.qty}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Mínimo</p>
                          <p className="font-medium text-muted-foreground text-lg">{item.min_qty}</p>
                        </div>

                        {stockPercentage >= 100 ? (
                          <TrendingUp className="w-6 h-6 text-accent" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-destructive" />
                        )}

                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openAdjustDialog(item)}
                          className="hover:border-primary hover:text-primary"
                        >
                          Ajustar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
            <DialogDescription>
              {selectedItem?.product.name} - {selectedItem?.store.name}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Stock Actual</p>
                <p className="text-3xl font-bold">{selectedItem.qty} unidades</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={adjustmentType === "add" ? "default" : "outline"}
                  onClick={() => setAdjustmentType("add")}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Entrada
                </Button>
                <Button
                  variant={adjustmentType === "subtract" ? "default" : "outline"}
                  onClick={() => setAdjustmentType("subtract")}
                  className="w-full"
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Salida
                </Button>
              </div>

              <div>
                <Label htmlFor="qty">Cantidad</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ingresa cantidad"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Ej: Reabastecimiento, venta, merma, etc."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>

              {adjustmentQty && (
                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-muted-foreground mb-1">Nuevo Stock</p>
                  <p className="text-2xl font-bold text-accent">
                    {adjustmentType === "add"
                      ? selectedItem.qty + parseFloat(adjustmentQty)
                      : Math.max(0, selectedItem.qty - parseFloat(adjustmentQty))}
                    {" "}unidades
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdjustDialog(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdjustStock}
              disabled={isProcessing || !adjustmentQty}
              className="gradient-primary"
            >
              {isProcessing ? "Procesando..." : "Confirmar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

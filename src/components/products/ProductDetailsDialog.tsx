import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Warehouse } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { Tables, Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
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
      <DialogContent className="sm:max-w-3xl max-h-[90dvh] overflow-y-auto custom-scrollbar bg-background border-border/40 shadow-pro p-0 rounded-[3rem]">
        {/* Header with Visual Impact */}
        <div className="bg-gradient-to-br from-primary/30 to-primary/5 p-10 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Package className="w-48 h-48 -rotate-12 translate-x-12 -translate-y-12 text-primary" />
          </div>
          <div className="relative flex items-center gap-6 mb-4">
            <div className="p-4 bg-primary/20 rounded-[2rem] text-primary border border-primary/20 shadow-glow-pro animate-pulse-subtle">
              <Package className="w-10 h-10" />
            </div>
            <div>
              <DialogTitle className="text-4xl font-black font-space-grotesk tracking-tighter italic uppercase text-white leading-none">
                {viewingProduct.name}
              </DialogTitle>
              <div className="flex gap-2 mt-3">
                 <Badge className="bg-primary/20 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest italic px-3 h-6">
                    {productTypeOptions.find(opt => opt.value === viewingProduct.type)?.label || viewingProduct.type}
                 </Badge>
                 {viewingProduct.sku && (
                    <Badge variant="outline" className="border-white/10 text-white/40 font-black text-[9px] uppercase tracking-widest italic px-3 h-6">
                        SKU: {viewingProduct.sku}
                    </Badge>
                 )}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <div className="px-10 py-4 bg-white/5 border-b border-white/5">
            <TabsList className="grid w-full grid-cols-2 bg-black/20 p-1.5 rounded-2xl h-14">
              <TabsTrigger value="info" className="rounded-xl font-black font-space-grotesk italic text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white">INFORMACIÓN MAESTRA</TabsTrigger>
              <TabsTrigger value="stock" className="rounded-xl font-black font-space-grotesk italic text-[10px] tracking-widest uppercase data-[state=active]:bg-primary data-[state=active]:text-white">DISTRIBUCIÓN STOCK</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-10">
            <TabsContent value="info" className="mt-0 space-y-10 animate-pro-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="group">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-3 block">IDENTIDAD COMERCIAL</Label>
                    <p className="text-2xl font-black font-space-grotesk italic text-white tracking-tighter shadow-glow-pro-text">{viewingProduct.name}</p>
                    {viewingProduct.description && (
                        <p className="mt-3 text-[11px] text-muted-foreground font-dm-sans italic leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                            {viewingProduct.description}
                        </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-2 block">CATEGORÍA</Label>
                        <Badge className="bg-white/5 text-white/80 border-white/10 font-black text-[9px] uppercase tracking-widest italic px-3 h-7">
                            {viewingProduct.category?.toUpperCase() || "N/A"}
                        </Badge>
                    </div>
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-2 block">SISTEMA STATUS</Label>
                        <Badge className={`${viewingProduct.active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} font-black text-[9px] uppercase tracking-widest italic px-3 h-7 border`}>
                            {viewingProduct.active ? "OPERATIVO" : "FUERA DE SERVICIO"}
                        </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-2 block">PROVEEDOR</Label>
                        <Badge className="bg-white/5 text-white/80 border-white/10 font-black text-[9px] uppercase tracking-widest italic px-3 h-7">
                            {viewingProduct.supplier_name?.toUpperCase() || "N/A"}
                        </Badge>
                    </div>
                    <div>
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-2 block">DESTACADO EN POS</Label>
                        <Badge className={`${viewingProduct.is_starred ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-glow-pro' : 'bg-white/5 text-white/40 border-white/10'} font-black text-[9px] uppercase tracking-widest italic px-3 h-7 border`}>
                            {viewingProduct.is_starred ? "⭐ DESTACADO" : "ESTÁNDAR"}
                        </Badge>
                    </div>
                  </div>

                  {viewingProduct.commission_rate !== null && (
                    <div className="pt-6 border-t border-white/5">
                        <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-2 block">COMISIÓN POR VENTA CAJERO</Label>
                        <p className="text-lg font-black font-space-grotesk italic text-primary">
                          {viewingProduct.commission_rate}% <span className="text-[10px] font-bold text-muted-foreground uppercase not-italic">por unidad vendida</span>
                        </p>
                    </div>
                  )}

                  <div className="pt-6 border-t border-white/5">
                      <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-2 block">FECHA SINCRONIZACIÓN</Label>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {new Date(viewingProduct.created_at || '').toLocaleString('es', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-8 glass-pro rounded-[2.5rem] border border-primary/20 shadow-glow-pro group hover:bg-primary/5 transition-all">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic mb-3 block">PRECIO VENTA PÚBLICO</Label>
                    <div className="flex items-end gap-2">
                        <p className="text-5xl font-black font-space-grotesk italic text-white tracking-tighter">
                            {formatCOP(viewingProduct.price).replace("$", "")}
                        </p>
                        <span className="text-sm font-black text-primary italic mb-2">COP</span>
                    </div>
                  </div>

                  {viewingProduct.cost && (
                    <div className="p-8 glass-pro rounded-[2.5rem] border border-white/5 hover:border-emerald-500/30 transition-all space-y-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 font-space-grotesk italic mb-1 block">VALOR COSTO</Label>
                                <p className="text-2xl font-black font-space-grotesk italic text-white/50 tracking-tighter">
                                    {formatCOP(viewingProduct.cost).replace("$", "")} <span className="text-[10px] font-bold">COP</span>
                                </p>
                             </div>
                             <div className="text-right">
                                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 font-space-grotesk italic mb-1 block">PROFIT %</Label>
                                <p className="text-2xl font-black font-space-grotesk italic text-emerald-400 tracking-tighter">
                                    {(((viewingProduct.price - viewingProduct.cost) / viewingProduct.price) * 100).toFixed(1)}%
                                </p>
                             </div>
                        </div>

                        {viewingProduct.margin_target !== null && (
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                            <div>
                              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 font-space-grotesk italic mb-1 block">META DE MARGEN</Label>
                              <p className="text-lg font-black font-space-grotesk italic text-white/70 tracking-tighter">
                                {viewingProduct.margin_target.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const actualMargin = ((viewingProduct.price - viewingProduct.cost!) / viewingProduct.price) * 100;
                                const meetsTarget = actualMargin >= viewingProduct.margin_target!;
                                return (
                                  <Badge className={cn(
                                    "font-black text-[9px] uppercase tracking-widest italic px-3 h-7 border",
                                    meetsTarget ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-glow-pro' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  )}>
                                    {meetsTarget ? "✓ CUMPLE META" : "✗ POR DEBAJO"}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        <div className="pt-6 border-t border-white/5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 font-space-grotesk italic mb-1 block">MARGEN BRUTO</Label>
                            <p className="text-3xl font-black font-space-grotesk italic text-emerald-400 tracking-tighter shadow-glow-pro-text">
                                + {formatCOP(viewingProduct.price - viewingProduct.cost).replace("$", "")} <span className="text-xs">COP</span>
                            </p>
                        </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stock" className="mt-0 space-y-6 animate-pro-in">
              {productStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="p-8 bg-white/5 rounded-[3rem] border border-white/5 opacity-30">
                    <Package className="w-16 h-16 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black font-space-grotesk italic uppercase tracking-widest text-white/40">SIN DATA LOGÍSTICA</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">No se han reportado niveles de stock en puntos de venta.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productStock.map((stock, index) => (
                    <Card key={stock.store_name} className="glass-pro border-white/5 hover:border-primary/30 transition-all duration-500 group overflow-hidden">
                      <CardContent className="p-6 relative">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                            <Warehouse className="w-20 h-20 text-primary" />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="space-y-1">
                            <p className="text-xs font-black font-space-grotesk italic uppercase tracking-widest text-white leading-tight group-hover:text-primary transition-colors">{stock.store_name}</p>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter opacity-40">
                              LÍMITE CRÍTICO: {stock.min_qty} {(viewingProduct as any).unit_measure || 'UNI'}
                            </p>
                          </div>
                          <div className="text-right">
                             <div className={cn(
                                "h-2 w-2 rounded-full shadow-glow animate-pulse",
                                stock.qty < stock.min_qty ? "bg-red-500" : "bg-emerald-500"
                             )} />
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between mt-6">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">DISPONIBILIDAD REAL</span>
                            <div className="text-right">
                                <p className={cn(
                                    "text-3xl font-black font-space-grotesk italic tracking-tighter leading-none mb-1",
                                    stock.qty < stock.min_qty ? 'text-red-400' : 'text-emerald-400'
                                )}>
                                    {stock.qty}
                                </p>
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                    {(viewingProduct as any).unit_measure || 'unidades'} EN PUNTO
                                </p>
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-10 pt-0">
          <Button 
            onClick={onClose}
            className="w-full h-16 rounded-[2rem] bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.4em] text-[10px] italic font-space-grotesk transition-all shadow-glow-pro active:scale-95 border-none"
          >
            CERRAR CONSULTA DE ACTIVO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit, Trash2, Eye, IceCream, Cherry, Wine, Candy, Tag } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { Tables, Enums } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import React from "react";
import { motion, Variants } from "framer-motion";

interface Product extends Tables<'products'> {
  stock?: number;
  mixtureStock?: number;
  has_recipe?: boolean;
}

type ProductType = Enums<'product_type'>;

const productTypeOptions: { value: ProductType; label: string; icon: React.ElementType }[] = [
  { value: "granizado", label: "Granizado", icon: IceCream },
  { value: "topping", label: "Topping", icon: Cherry },
  { value: "sachet", label: "Sachet", icon: Wine },
  { value: "sweet", label: "Dulce", icon: Candy },
];

interface ProductGridDisplayProps {
  products: Product[];
  loading: boolean;
  searchQuery: string;
  filterActive: string;
  filterType: ProductType | "all";
  openCreateDialog: () => void;
  openEditDialog: (product: Product) => void;
  openDetailsDialog: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  userStoreId: string | null;
}

export default function ProductGridDisplay({
  products,
  loading,
  searchQuery,
  filterActive,
  filterType,
  openCreateDialog,
  openEditDialog,
  openDetailsDialog,
  handleDeleteProduct,
  userStoreId,
}: ProductGridDisplayProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-8 animate-pro-in">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-glow-pro" />
          <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse rounded-full" />
        </div>
        <div className="text-center space-y-2">
            <p className="text-white font-black font-space-grotesk italic tracking-[0.4em] text-xs animate-pulse">INDEXANDO CATÁLOGO</p>
            <p className="text-[10px] text-primary/40 font-black uppercase tracking-widest">Data Stream Logic v2.0</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="glass-pro shadow-pro border-dashed border-white/5 bg-transparent rounded-[3rem] animate-pro-in overflow-hidden">
        <CardContent className="text-center py-24 relative">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-50" />
          <div className="relative z-10">
            <div className="p-8 bg-white/5 rounded-[3rem] w-fit mx-auto mb-10 border border-white/10 shadow-inner group transition-all hover:rotate-6 hover:scale-110">
                <Package className="w-20 h-20 text-white/20 group-hover:text-primary transition-colors duration-500 drop-shadow-glow" />
            </div>
            <h3 className="text-4xl font-black font-space-grotesk italic uppercase tracking-tighter mb-4 text-white">CATÁLOGO VACÍO</h3>
            <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em] mb-12 max-w-sm mx-auto leading-relaxed italic">
                {searchQuery || filterActive !== "all" || filterType !== "all"
                ? "No se detectaron registros bajo los parámetros de búsqueda actuales."
                : "La base de datos maestra no contiene registros. Inicialice el catálogo operativo."}
            </p>
            {!searchQuery && filterActive === "all" && filterType === "all" && (
                <Button 
                onClick={openCreateDialog} 
                className="rounded-2xl bg-white text-black hover:bg-primary hover:text-white font-black italic uppercase tracking-widest text-xs px-12 h-16 shadow-glow-pro active:scale-95 transition-all group overflow-hidden relative"
                disabled={!userStoreId}
                >
                <Plus className="mr-3 w-5 h-5 relative z-10" />
                <span className="relative z-10">REGISTRAR PRODUCTO MAESTRO</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
    >
      {products.map((product) => {
        const ProductIcon = productTypeOptions.find(opt => opt.value === product.type)?.icon || Package;
        return (
          <motion.div key={product.id} variants={item}>
            <Card 
              className={cn(
                "glass-pro transition-all duration-700 group relative overflow-hidden shadow-pro dim-layering rounded-[2.5rem] h-full flex flex-col hover:bg-surface-active",
                !product.active && "opacity-40 grayscale-[0.8]"
              )}
            >
              {product.is_starred && (
                <div className="absolute top-4 left-4 p-2 bg-amber-500 text-white rounded-xl shadow-glow border border-amber-400/20 z-20 animate-pulse-subtle flex items-center justify-center">
                  <span className="text-xs">⭐</span>
                </div>
              )}

              <div className="absolute -right-10 -top-10 p-14 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-125 transition-all duration-1000 rotate-12">
                  <ProductIcon className="w-40 h-40 text-primary" />
              </div>

              {/* Decorative side accent */}
              <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-primary/0 group-hover:bg-primary/50 transition-all rounded-full" />
              
              <CardContent className="p-8 relative z-10 flex flex-col h-full">
                {/* Header actions */}
                <div className={cn("flex items-start justify-between mb-8", product.is_starred && "pl-8")}>
                  <div className="flex flex-col gap-2">
                    <Badge className={cn(
                      "w-fit font-black text-[8px] uppercase tracking-[0.3em] font-space-grotesk italic border-none shadow-glow-pro px-3 h-6",
                      product.active ? "bg-primary text-white" : "bg-neutral-800 text-neutral-400"
                    )}>
                      {product.active ? "STATUS: OPERATIVO" : "STATUS: INACTIVO"}
                    </Badge>
                    {product.sku && (
                      <span className="text-[9px] font-black font-space-grotesk tracking-[0.3em] text-primary/60 italic px-1 uppercase">
                        SKU • {product.sku}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 transition-all duration-700">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 glass-pro rounded-xl text-muted-foreground/60 hover:text-primary hover:bg-primary/20 shadow-pro transition-all hover:-translate-y-1 active:scale-90"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDetailsDialog(product); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 glass-pro rounded-xl text-muted-foreground/60 hover:text-emerald-500 hover:bg-emerald-500/20 shadow-pro transition-all hover:-translate-y-1 active:scale-90"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditDialog(product); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 glass-pro rounded-xl text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/20 shadow-pro transition-all hover:-translate-y-1 active:scale-90 border-none"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteProduct(product); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Product main info */}
                <div className="mb-6 flex-1">
                  <h3 className="text-2xl font-black font-space-grotesk italic uppercase tracking-tighter mb-2 group-hover:text-primary transition-colors leading-tight drop-shadow-glow">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-[10px] text-white/40 font-dm-sans line-clamp-2 leading-relaxed italic group-hover:text-white/60 transition-colors">
                      {product.description}
                    </p>
                  )}
                </div>
                
                <div className="mt-auto space-y-6">
                  <div className="flex items-end justify-between py-6 border-y border-border/50 relative overflow-hidden group/price">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent scale-x-0 group-hover/price:scale-x-100 transition-transform duration-700" />
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-primary/40 font-space-grotesk italic mb-1">VALOR MAESTRO</span>
                        <div className="flex items-center gap-1.5">
                            <p className="text-4xl font-black font-space-grotesk italic text-foreground tracking-tighter drop-shadow-glow-pro text-glow">
                                {formatCOP(product.price || 0).replace("$", "")}
                            </p>
                            <span className="text-[10px] font-black text-primary/40 mb-1 font-space-grotesk italic tracking-widest">COP</span>
                        </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <ProductIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] italic font-space-grotesk transition-colors group-hover:text-primary">
                            {productTypeOptions.find(opt => opt.value === product.type)?.label}
                        </span>
                    </div>

                    <Badge 
                      className={cn(
                        "font-black text-[10px] uppercase tracking-widest italic border-none bg-muted/50 px-3 h-7 shadow-pro",
                        ((product.mixtureStock ?? 0) > 0 || ((product.stock ?? 0) > 0)) ? "text-emerald-500" : "text-rose-500 shadow-glow-pro animate-pulse"
                      )}
                    >
                      {(product.type === 'granizado' || product.category === 'Granizado') ? (
                          <span>{((product.mixtureStock ?? 0) / 1000).toFixed(1)}L DISP</span>
                      ) : (
                        `STK: ${product.stock ?? product.mixtureStock ?? 0} UNI`
                      )}
                    </Badge>
                  </div>
                  
                  {product.category && (
                    <div className="pt-4 flex items-center gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                        <Tag className="w-3 h-3 text-primary" />
                        <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white">CATEGORY • {product.category.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
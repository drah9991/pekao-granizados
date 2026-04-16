import { motion, AnimatePresence } from "framer-motion";
import { Product } from "@/lib/pos-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Hash, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { offlineService } from "@/lib/OfflineService";
import { cn } from "@/lib/utils";

interface ProductWithStock extends Product {
  stock?: number;
}

interface ProductGridProps {
  onProductSelect: (product: Product) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  activeCategoryIndex?: number;
}

export default function ProductGrid({ onProductSelect, searchRef, activeCategoryIndex }: ProductGridProps) {
  const { storeId } = useAuth();
  const queryClient = useQueryClient();
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Stagger variants for the products
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
  };

  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);

  useEffect(() => {
    if (activeCategoryIndex !== undefined) {
      const cats = categories;
      if (activeCategoryIndex < cats.length) {
        setActiveCategory(cats[activeCategoryIndex]);
      }
    }
  }, [activeCategoryIndex]);

  const { data: gridData, isLoading: queryLoading } = useQuery({
    queryKey: ['products-grid', storeId],
    queryFn: async () => {
      if (!storeId) return { products: [], sizes: [], types: [] };
      
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            store_stock ( qty ),
            recipes (
              inventory_item_id,
              inventory_items (
                id,
                stock,
                is_mixture
              )
            )
          `)
          .eq('active', true)
          .order("name", { ascending: true });

        if (error) throw error;
        
        const { data: typesData } = await supabase.from("product_types_config").select("*").eq('active', true).order("created_at", { ascending: true });
        
        const productsWithStock = (data || []).map((p: any) => {
          const stock = p.store_stock?.[0]?.qty ?? 0;
          let mixtureStock = 0;

          const typeCfg = (typesData || []).find((t: any) => t.code === p.type);
          const isMixtureTracked = typeCfg?.track_mixture_inventory ?? (p.type === "granizado" || p.category === "Granizado");

          if (isMixtureTracked) {
            const mixtureRecipe = (p.recipes as any[] || []).find(
              (r: any) => r.inventory_items?.is_mixture === true
            );
            if (mixtureRecipe) {
              mixtureStock = mixtureRecipe.inventory_items?.stock ?? 0;
            }
          }

          const has_recipe = p.recipes && p.recipes.length > 0;

          return { ...p, stock, mixtureStock, has_recipe };
        });

        const { data: sizesData } = await supabase.from("sizes").select("name, multiplier, id").eq("store_id", storeId);
        
        await offlineService.saveProducts(productsWithStock);
        return { products: productsWithStock, sizes: sizesData || [], types: typesData || [] };
      } catch (error: any) {
        console.error("Error fetching products, checking offline:", error);
        const cached = await offlineService.getProducts();
        return { products: cached || [], sizes: [], types: [], isOffline: true };
      }
    },
    enabled: !!storeId,
    refetchInterval: 60000 
  });

  useEffect(() => {
    if (gridData) {
      setProducts(gridData.products);
      setSizes(gridData.sizes);
      setTypes(gridData.types);
      if (gridData.isOffline) {
        setIsOfflineMode(true);
      } else {
        setIsOfflineMode(false);
      }
      setLoading(false);
    }
  }, [gridData]);

  const fetchProducts = () => {
    setLoading(true);
  };

  const getTypeConfig = (typeCode: string) => {
    const t = types.find(t => t.code === typeCode);
    if (t) return { label: t.label, emoji: t.emoji_icon, color: t.color_theme, track_mixture_inventory: t.track_mixture_inventory, sales_mode: t.sales_mode };
    return { label: typeCode.charAt(0).toUpperCase() + typeCode.slice(1), emoji: "📦", color: "bg-slate-600", track_mixture_inventory: false, sales_mode: "unit" };
  };

  const categories = useMemo(() => {
    const prodTypes = new Set((products || []).map(p => p.type || "other"));
    const knownOrder = types.map(t => t.code);
    const sorted = Array.from(prodTypes).sort(
      (a, b) => {
        const ia = knownOrder.indexOf(a);
        const ib = knownOrder.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
    );
    return ["all", ...sorted];
  }, [products, types]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => {
      const type = p.type || "other";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "all" || product.type === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory]);

  if (loading) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full shadow-glow" />
        <p className="text-muted-foreground font-medium animate-pulse">Preparando inventario...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto bg-transparent animate-pro-in">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            ref={searchRef}
            placeholder="Buscar producto..."
            className="pl-12 h-14 lg:h-16 text-base lg:text-lg glass-pro border-border rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 shadow-pro font-dm-sans"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
             {isOfflineMode && (
               <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black border border-amber-500/20 animate-pulse">
                 <WifiOff className="h-3 w-3" />
                 OFFLINE
               </div>
             )}
             <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] bg-muted border border-border rounded-md text-muted-foreground font-space-grotesk tracking-widest">CMD + K</kbd>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-10 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const cfg = cat === "all" ? null : getTypeConfig(cat);
          const isActive = activeCategory === cat;
          return (
            <Button
              key={cat}
              variant={isActive ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "h-14 lg:h-16 px-4 lg:px-8 gap-3 rounded-2xl transition-all border font-space-grotesk shrink-0",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-glow-pro scale-105" 
                  : "bg-muted/40 border-border text-muted-foreground hover:bg-muted/80 hover:border-primary/20 hover:text-foreground"
              )}
            >
              <span className="text-2xl">{cat === "all" ? "⚡" : cfg?.emoji}</span>
              <span className="font-black flex items-center gap-2 uppercase tracking-widest text-[10px] lg:text-xs">
                {cat === "all" ? "Catálogo" : cfg?.label}
                <Badge className={cn("text-[9px] lg:text-[10px] font-black border-none", isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground")}>
                  {categoryCounts[cat]}
                </Badge>
              </span>
            </Button>
          );
        })}
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {(filteredProducts || []).map((product) => {
            const cfg = getTypeConfig(product.type || "other");
            const emoji = cfg.emoji;
            const qty = product.stock || 0;
            const isMixtureTracked = cfg.track_mixture_inventory; 
            const isOutOfStock = isMixtureTracked 
              ? (product.mixtureStock === undefined || product.mixtureStock <= 0) 
              : qty <= 0;
            const isLowStock = !isMixtureTracked && qty > 0 && qty < 10;

            return (
              <motion.div key={product.id} variants={itemVariants} layout>
                <button
                  onClick={() => {
                    if (isOutOfStock) {
                      toast.error(`Sin existencias de ${product.name}`, {
                        icon: "🚫",
                        className: "glass-pro border-red-500/50 text-red-500 font-bold"
                      });
                      return;
                    }
                    onProductSelect(product);
                  }}
                  className={cn(
                    "group relative w-full h-48 lg:h-56 rounded-[2.5rem] border overflow-hidden transition-all duration-700",
                    isOutOfStock 
                      ? "opacity-40 grayscale border-border cursor-not-allowed bg-muted/40" 
                      : "glass-pro border-border hover:border-primary/50 hover:shadow-glow-pro active:scale-95"
                  )}
                >
                  {!isOutOfStock && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent group-hover:via-primary transition-all duration-1000" />
                  )}
                  
                  <div className="relative h-full p-6 flex flex-col items-start justify-between">
                    <div className="w-full flex items-start justify-between">
                      <div className={cn(
                        "p-4 rounded-3xl transition-all duration-700 shadow-pro",
                        isOutOfStock ? "bg-muted" : "bg-primary/20 border border-primary/20 group-hover:rotate-12 group-hover:scale-110"
                      )}>
                         <span className="text-4xl filter drop-shadow-xl">{emoji}</span>
                      </div>
                      
                      {product.stock !== undefined && (
                        <Badge 
                           className={cn(
                             "font-black text-[9px] px-3 py-1 rounded-xl border-none font-space-grotesk tracking-widest uppercase shadow-pro",
                             isOutOfStock ? "bg-rose-500 text-white shadow-glow-pro animate-pulse" : 
                             isLowStock ? "appetite-accent scale-105" : 
                             "bg-muted/80 text-primary border border-border"
                           )}
                           style={isOutOfStock || isLowStock ? { textShadow: "1px 0 0 rgba(255,0,0,0.5), -1px 0 0 rgba(0,255,255,0.5)" } : {}}
                        >
                          {cfg.track_mixture_inventory ? (
                            <div className="flex flex-col items-end leading-tight group/stock">
                               <span className="flex items-center gap-1.5">
                                 {!isOutOfStock && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                 {(product.mixtureStock! / 1000).toFixed(1)}L
                               </span>
                               <div className="flex gap-1 mt-1 opacity-0 group-hover/stock:opacity-100 transition-opacity">
                                 {(sizes || []).slice(0, 3).map((s, i) => {
                                   const baseVol = Number(product.base_volume) || 4;
                                   const availableQty = Math.floor(product.mixtureStock! / (baseVol * (s.multiplier || 1) * 29.57));
                                   return (
                                     <span key={i} className="text-[7px] font-black border-l border-white/20 pl-1 first:border-none">
                                       {s.name?.replace(/[^0-9]/g, '') || '?'}:<span className="text-foreground ml-0.5">{availableQty}</span>
                                     </span>
                                   );
                                 })}
                               </div>
                            </div>
                          ) : (
                            `Stock: ${qty}`
                          )}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="w-full text-left">
                      <p className="font-black text-foreground text-base leading-tight mb-1 font-space-grotesk italic tracking-tighter uppercase group-hover:text-primary transition-colors text-glow">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="font-black text-xl lg:text-2xl text-foreground font-space-grotesk italic">
                          {formatCOP(product.price)}
                        </p>
                        {!isOutOfStock && (
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 border border-primary/20 shadow-glow-pro",
                            isLowStock ? "appetite-accent" : "bg-primary text-primary-foreground"
                          )}>
                            <span className="text-xl font-black">+</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-20 bg-muted/40 rounded-[3rem] border border-dashed border-border">
          <div className="text-7xl mb-4 opacity-50">🛒✨</div>
          <h3 className="text-xl font-bold text-foreground mb-2">¿Buscas algo especial?</h3>
          <p className="text-muted-foreground">No encontramos productos con "{searchQuery}"</p>
          <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-primary">
            Ver todo el catálogo
          </Button>
        </div>
      )}
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/pos-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useRef, useCallback, memo, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCOP } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Hash, WifiOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { offlineService } from "@/lib/OfflineService";
import { cn } from "@/lib/utils";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { mapProductStock } from "@/utils/productStockUtils";

interface ProductWithStock extends Product {
  stock?: number;
}

interface ProductGridProps {
  onProductSelect: (product: Product) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  activeCategoryIndex?: number;
}

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

interface ProductCardProps {
  product: ProductWithStock;
  onProductSelect: (product: Product) => void;
  getTypeConfig: (typeCode: string) => {
    label: string;
    emoji: string;
    color: string;
    track_mixture_inventory: boolean;
    sales_mode: string;
  };
}

const ProductCard = memo(function ProductCard({ product, onProductSelect, getTypeConfig }: ProductCardProps) {
  const cfg = getTypeConfig(product.type || "other");
  const emoji = cfg.emoji;
  const qty = product.stock || 0;
  const isMixtureTracked = cfg.track_mixture_inventory;
  const isOutOfStock = isMixtureTracked
    ? (product.mixtureStock === undefined || product.mixtureStock <= 0)
    : (qty <= 0 && (product.mixtureStock === undefined || product.mixtureStock <= 0));
  const isLowStock = isMixtureTracked
    ? (product.mixtureStock !== undefined && product.mixtureStock > 0 && product.mixtureStock < 2000)
    : ((qty > 0 && qty < 10) || (product.mixtureStock !== undefined && product.mixtureStock > 0 && product.mixtureStock < 10));

  const prefersReducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isOutOfStock) return;

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const container = button.querySelector(".ripple-container");
    if (!container) return;

    const ripple = document.createElement("span");
    ripple.className = "ripple-span";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    
    ripple.addEventListener("animationend", () => {
      ripple.remove();
    });
    
    container.appendChild(ripple);
  };

  return (
    <motion.div 
      key={product.id} 
      variants={itemVariants} 
      className="product-card-container"
    >
      <button
        onMouseDown={handleMouseDown}
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
          "product-card-button group relative rounded-2xl border overflow-hidden transition-all duration-200 text-left",
          isOutOfStock
            ? "opacity-30 grayscale cursor-not-allowed bg-surface-subtle border-border/50"
            : isLowStock
            ? "bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/[0.06] animate-border-glow-pulse active:scale-[0.98]"
            : "bg-surface-subtle border-border/50 hover:border-primary/30 hover:bg-surface-active hover:shadow-glow active:scale-[0.98]"
        )}
      >
        {/* Ripple Effect elements */}
        <span className="ripple-container" />

        {/* Row 1: Emoji & Stock Badge */}
        <div className="product-card-header p-5 pb-0 w-full flex items-start justify-between z-10">
          <div className="flex gap-2">
            <div className={cn(
              "product-card-emoji-wrapper w-12 h-12 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm relative",
              isOutOfStock ? "bg-muted" : "bg-surface-active border border-border/50 group-hover:scale-110 group-hover:rotate-3"
            )}>
              <span className="product-card-emoji text-3xl lg:text-4xl filter drop-shadow-lg">{emoji}</span>
            </div>
            {product.is_starred && (
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xs shadow-glow shrink-0 animate-pulse-subtle">
                ⭐
              </div>
            )}
          </div>

          {product.stock !== undefined && (
            <div
              className={cn(
                "product-card-badge font-bold text-[10px] px-2.5 py-1 rounded-lg border-none font-dm-sans tracking-tight uppercase flex items-center gap-1.5 shrink-0 z-10",
                isOutOfStock ? "bg-rose-500/20 text-rose-500" :
                isLowStock ? "bg-amber-500/20 text-amber-500 animate-pulse" :
                "bg-muted/50 text-muted-foreground"
              )}
            >
              {isLowStock && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 shadow-glow-pro" />
              )}
              {cfg.track_mixture_inventory ? (
                <span>
                  {(product.mixtureStock! / 1000).toFixed(1)}L
                </span>
              ) : (
                <span>
                  {`Stock: ${qty || product.mixtureStock || 0}`}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Title */}
        <div className="product-card-body px-5 pt-3 w-full text-left z-10">
          <p className="product-card-title font-bold text-foreground text-sm lg:text-base leading-snug font-dm-sans text-wrap text-pretty line-clamp-2 transition-colors duration-300">
            {product.name}
          </p>
        </div>

        {/* Row 3: Price + Add Button */}
        <div className="product-card-footer px-5 pb-5 pt-2 w-full flex items-end justify-between gap-2 z-10">
          <p className="product-card-price font-extrabold text-lg lg:text-2xl text-primary font-dm-sans tracking-tight">
            {formatCOP(product.price)}
          </p>
          {!isOutOfStock && (
            <div className={cn(
              "product-card-add-btn w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 border border-primary/20",
              isLowStock ? "bg-amber-500 text-white" : "bg-primary text-white"
            )}>
              <span className="text-lg font-bold">+</span>
            </div>
          )}
        </div>

        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 blur-[40px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      </button>
    </motion.div>
  );
});

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

  const handleSearchChange = useDebouncedCallback((value: string) => {
    setSearchQuery(value);
  }, 150);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId]);

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

  useEffect(() => {
    if (activeCategoryIndex !== undefined) {
      const cats = categories;
      if (activeCategoryIndex < cats.length) {
        setActiveCategory(cats[activeCategoryIndex]);
      }
    }
  }, [activeCategoryIndex, categories]);

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
              quantity_required,
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

        const productsWithStock = (data || []).map((p: any) => mapProductStock(p, typesData || []));

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

  const getTypeConfig = useCallback((typeCode: string) => {
    const t = types.find(t => t.code === typeCode);
    if (t) return { label: t.label, emoji: t.emoji_icon, color: t.color_theme, track_mixture_inventory: t.track_mixture_inventory, sales_mode: t.sales_mode };
    return { label: typeCode.charAt(0).toUpperCase() + typeCode.slice(1), emoji: "📦", color: "bg-slate-600", track_mixture_inventory: false, sales_mode: "unit" };
  }, [types]);

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
    }).sort((a, b) => {
      const aStarred = a.is_starred ? 1 : 0;
      const bStarred = b.is_starred ? 1 : 0;
      return bStarred - aStarred; // Starred first
    });
  }, [products, searchQuery, activeCategory]);

  const [isCategoryPending, startCategoryTransition] = useTransition();

  const handleSetActiveCategory = useCallback((cat: string) => {
    startCategoryTransition(() => {
      setActiveCategory(cat);
    });
  }, []);

  if (loading && !products.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-20 bg-background/50 backdrop-blur-xl rounded-[3rem] border border-white/5 shadow-pro animate-pulse">
        <div className="relative mb-8">
           <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-glow-primary" />
           <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
           </div>
        </div>
        <h3 className="text-xl font-black font-space-grotesk italic uppercase tracking-tighter text-foreground mb-1">
          Sincronizando <span className="text-primary text-glow">Menú</span>
        </h3>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 font-space-grotesk italic">
           Data Stream Pipeline Active • v2.0
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-auto bg-transparent animate-pro-in products-panel">
      <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-2xl group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 group-focus-within:text-primary transition-all duration-300" />
          <Input
            ref={searchRef}
            placeholder="Buscar por nombre o categoría..."
            className="pl-14 h-14 lg:h-16 text-lg glass-pro !bg-surface-subtle border-border/50 rounded-2xl focus:border-primary/30 focus:ring-0 transition-all placeholder:text-muted-foreground/30 font-dm-sans"
            defaultValue={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="Buscar productos por nombre o categoría"
          />
          {/* Material-style sliding underline indicator */}
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-primary transition-all duration-300 group-focus-within:w-[calc(100%-2.5rem)] rounded-full z-10" />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-4">
             {isOfflineMode && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-bold border border-amber-500/20">
                 <WifiOff className="h-3.5 w-3.5" />
                 OFFLINE
               </div>
             )}
             <kbd className="hidden sm:inline-flex px-2.5 py-1 text-[10px] bg-muted border border-border rounded-lg text-muted-foreground font-medium tracking-tighter">⌘ K</kbd>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 mb-12 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const cfg = cat === "all" ? null : getTypeConfig(cat);
          const isActive = activeCategory === cat;
          return (
            <Button
              key={cat}
              variant={isActive ? "default" : "outline"}
              onClick={() => handleSetActiveCategory(cat)}
              className={cn(
                "h-12 lg:h-14 px-6 lg:px-8 gap-2.5 rounded-xl transition-all duration-300 border font-dm-sans shrink-0",
                isActive
                  ? "bg-primary text-white border-primary shadow-glow scale-[1.02]"
                  : "bg-surface-subtle border-border/50 text-muted-foreground hover:bg-surface-active hover:border-border hover:text-foreground"
              )}
            >
              <span className="text-xl">{cat === "all" ? "📋" : cfg?.emoji}</span>
              <span className="font-semibold flex items-center gap-2 text-xs uppercase tracking-tight">
                {cat === "all" ? "Todos" : cfg?.label}
                <span className={cn("px-1.5 py-0.5 rounded-md text-[10px] font-bold", isActive ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground")}>
                  {categoryCounts[cat]}
                </span>
              </span>
            </Button>
          );
        })}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="products-grid"
      >
        <AnimatePresence mode="popLayout">
          {(filteredProducts || []).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onProductSelect={onProductSelect}
              getTypeConfig={getTypeConfig}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-20 bg-muted/40 rounded-[3rem] border border-dashed border-border">
          <div className="text-7xl mb-4 opacity-50">🛒✨</div>
          <h3 className="text-xl font-bold text-foreground mb-2">¿Buscas algo especial?</h3>
          <p className="text-muted-foreground">No encontramos productos con "{searchQuery}"</p>
          <Button variant="link" onClick={handleClearSearch} className="mt-2 text-primary">
            Ver todo el catálogo
          </Button>
        </div>
      )}
    </div>
  );
}

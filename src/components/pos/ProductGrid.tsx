import { Product } from "@/lib/pos-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useRef } from "react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Hash } from "lucide-react";

interface ProductWithStock extends Product {
  stock?: number;
}

interface ProductGridProps {
  onProductSelect: (product: Product) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  activeCategoryIndex?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  granizado: "from-blue-600 to-cyan-500",
  topping: "from-amber-600 to-orange-500",
  sachet: "from-emerald-600 to-green-500",
  sweet: "from-pink-600 to-rose-500",
  other: "from-slate-600 to-slate-500",
  default: "from-gray-600 to-gray-500",
};

const CATEGORY_EMOJI: Record<string, string> = {
  granizado: "🥤",
  topping: "🍫",
  sachet: "📦",
  sweet: "🍬",
  other: "📦",
};

export default function ProductGrid({ onProductSelect, searchRef, activeCategoryIndex }: ProductGridProps) {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetchUserStoreId();
  }, []);

  useEffect(() => {
    if (userStoreId) {
      fetchProducts();
    }
  }, [userStoreId]);

  // Handle external category change (shortcuts)
  useEffect(() => {
    if (activeCategoryIndex !== undefined) {
      const cats = categories;
      if (activeCategoryIndex < cats.length) {
        setActiveCategory(cats[activeCategoryIndex]);
      }
    }
  }, [activeCategoryIndex]);

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
      }
    } catch (error: any) {
      console.error("Error fetching store ID:", error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Fetch products and their first recipe item stock for display
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          recipes (
            inventory_items (
              stock
            )
          )
        `)
        .eq('store_id', userStoreId!)
        .eq('active', true)
        .order("name", { ascending: true });

      if (error) throw error;
      
      const productsWithStock = (data || []).map((p: any) => ({
        ...p,
        // Using the first recipe's constituent stock as the primary indicator
        stock: p.recipes?.[0]?.inventory_items?.stock
      }));

      setProducts(productsWithStock);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.type || "other"));
    return ["all", ...Array.from(cats)];
  }, [products]);

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
    <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto bg-slate-950/20">
      {/* Header with Search */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-lg group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            ref={searchRef}
            placeholder="Buscar producto o escriba..."
            className="pl-12 h-14 text-lg bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
             <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] bg-white/10 border border-white/20 rounded-md text-muted-foreground">/ para buscar</kbd>
             <kbd className="hidden sm:inline-flex px-2 py-1 text-[10px] bg-white/10 border border-white/20 rounded-md text-muted-foreground">F1-F4 categorías</kbd>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        {categories.map((cat, idx) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            onClick={() => setActiveCategory(cat)}
            className={`h-14 px-6 gap-3 rounded-2xl transition-all border-2 ${
              activeCategory === cat 
                ? 'gradient-primary border-primary shadow-glow' 
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
            }`}
          >
            <span className="text-xl">{cat === "all" ? "🔥" : CATEGORY_EMOJI[cat] || "📦"}</span>
            <span className="font-bold flex items-center gap-2">
              {cat === "all" ? "Todos" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              <Badge className="bg-white/20 text-white border-none text-[10px]">
                {categoryCounts[cat]}
              </Badge>
            </span>
          </Button>
        ))}
      </div>

      {/* Product List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredProducts.map((product) => {
          const colorClass = CATEGORY_COLORS[product.type || "default"] || CATEGORY_COLORS.default;
          const emoji = CATEGORY_EMOJI[product.type || "other"] || "📦";
          const isLowStock = product.stock !== undefined && product.stock <= 10;

          return (
            <button
              key={product.id}
              onClick={() => onProductSelect(product)}
              className="group relative h-48 rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-2 active:scale-95 bg-white/5"
            >
              {/* Background Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-10 group-hover:opacity-20 transition-opacity`} />
              
              <div className="relative h-full p-5 flex flex-col items-start justify-between">
                <div className="w-full flex items-start justify-between">
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorClass} shadow-lg group-hover:scale-110 transition-transform`}>
                     <span className="text-3xl filter drop-shadow-md">{emoji}</span>
                  </div>
                  {product.stock !== undefined && (
                    <Badge 
                       variant={isLowStock ? "destructive" : "secondary"}
                       className={`font-black text-[10px] px-2 py-0.5 rounded-full ${!isLowStock && 'bg-emerald-500/20 text-emerald-400 border-none'}`}
                    >
                      {product.stock.toFixed(0)} uds
                    </Badge>
                  )}
                </div>
                
                <div className="w-full text-left space-y-1">
                  <p className="font-bold text-slate-200 text-base leading-tight group-hover:text-white transition-colors">
                    {product.name}
                  </p>
                  <p className="font-black text-2xl bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <div className="text-7xl mb-4 opacity-50">🛒✨</div>
          <h3 className="text-xl font-bold text-slate-300 mb-2">¿Buscas algo especial?</h3>
          <p className="text-muted-foreground">No encontramos productos con "{searchQuery}"</p>
          <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-primary">
            Ver todo el catálogo
          </Button>
        </div>
      )}
    </div>
  );
}

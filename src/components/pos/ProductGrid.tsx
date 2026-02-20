import { Product } from "@/lib/pos-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface ProductGridProps {
  onProductSelect: (product: Product) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  granizado: "from-blue-500 to-cyan-500",
  topping: "from-amber-500 to-orange-500",
  sachet: "from-emerald-500 to-green-500",
  sweet: "from-pink-500 to-rose-500",
  other: "from-violet-500 to-purple-500",
  default: "from-gray-500 to-gray-600",
};

const CATEGORY_EMOJI: Record<string, string> = {
  granizado: "🥤",
  topping: "🍫",
  sachet: "📦",
  sweet: "🍬",
  other: "📦",
};

export default function ProductGrid({ onProductSelect }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
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

  const fetchUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
      } else {
        toast.warning("No se encontró un ID de tienda para el usuario.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq('store_id', userStoreId!)
        .eq('active', true)
        .order("name", { ascending: true });

      if (error) throw error;
      setProducts(data as Product[] || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error("Error al cargar productos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.type || "other"));
    return ["all", ...Array.from(cats)];
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
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold mb-3 bg-gradient-hero bg-clip-text text-transparent">
          Punto de Venta
        </h1>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            className="pl-10 h-12 text-base border-2"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="min-h-[40px] min-w-[44px] px-4 text-sm font-semibold whitespace-nowrap rounded-full"
          >
            {cat === "all" ? "Todos" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {filteredProducts.map((product) => {
          const colorClass = CATEGORY_COLORS[product.type || "default"] || CATEGORY_COLORS.default;
          const emoji = CATEGORY_EMOJI[product.type || "other"] || "📦";

          return (
            <button
              key={product.id}
              onClick={() => onProductSelect(product)}
              className="group relative h-36 md:h-44 rounded-2xl border-2 border-border overflow-hidden transition-all duration-200 hover:shadow-elevated hover:-translate-y-1 hover:border-primary active:scale-95"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-85`} />
              <div className="relative h-full p-4 flex flex-col items-start justify-between text-white">
                <div className="w-full flex items-start justify-between">
                  <Badge variant="secondary" className="text-xs font-semibold bg-white/90 text-foreground hover:bg-white">
                    {product.category || product.type || 'General'}
                  </Badge>
                  <div className="text-3xl md:text-4xl">{emoji}</div>
                </div>
                <div className="w-full">
                  <p className="font-bold text-left text-sm md:text-base mb-1 leading-tight">{product.name}</p>
                  <p className="font-bold text-left text-xl md:text-2xl">{formatCurrency(product.price)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-muted-foreground">No se encontraron productos</p>
        </div>
      )}
    </div>
  );
}

import { Product } from "@/lib/pos-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

interface ProductGridProps {
  onProductSelect: (product: Product) => void;
}

export default function ProductGrid({ onProductSelect }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

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
        toast.warning("No se encontró un ID de tienda para el usuario. No podrás ver productos.");
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
        .eq('type', 'granizado') // Only fetch granizados for the main grid
        .eq('active', true) // Only active products
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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-hero bg-clip-text text-transparent">
          Punto de Venta
        </h1>
        <Input 
          placeholder="🔍 Buscar productos..." 
          className="max-w-md text-base border-2"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductSelect(product)}
            className="group relative h-32 md:h-40 rounded-2xl border-2 border-border overflow-hidden transition-smooth hover:shadow-elevated hover:-translate-y-1 hover:border-primary"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${product.color || 'from-gray-400 to-gray-600'} opacity-80`} />
            <div className="relative h-full p-4 flex flex-col items-start justify-between text-white">
              <div className="w-full flex items-start justify-between">
                <Badge variant="secondary" className="text-xs font-semibold bg-white/90 text-foreground hover:bg-white">
                  {product.category || 'General'}
                </Badge>
                <div className="text-3xl md:text-4xl">{product.emoji || '🥤'}</div>
              </div>
              <div className="w-full">
                <p className="font-bold text-left text-sm md:text-base mb-1">{product.name}</p>
                <p className="font-bold text-left text-xl md:text-2xl">{formatCurrency(product.price)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
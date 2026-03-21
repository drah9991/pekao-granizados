import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useLowStockCount() {
  const [count, setCount] = useState(0);
  const { storeId } = useAuth();

  const fetchLowStock = async () => {
    if (!storeId) return;

    try {
      // Query: SELECT COUNT(*) FROM inventory_items WHERE stock <= min_stock AND store_id = ?
      // Nota: PostgREST no soporta directamente el filtro col1 <= col2 en la URL de forma nativa sencilla
      // sin usar un filtro .or o un .rpc. 
      // Sin embargo, podemos traer los que tienen min_stock > 0 y filtrar localmente, 
      // o usar un filtro aproximado si no es crítico el tiempo real perfecto.
      
      const { data, error } = await supabase
        .from("inventory_items")
        .select("stock, min_stock")
        .eq("store_id", storeId)
        .not("min_stock", "is", null);

      if (error) throw error;
      
      const lowStockItems = data?.filter(item => item.stock <= (item.min_stock || 0)) || [];
      setCount(lowStockItems.length);
    } catch (err) {
      console.error("Error fetching low stock count:", err);
    }
  };

  useEffect(() => {
    fetchLowStock();

    // Refresh every 5 minutes as requested
    const interval = setInterval(fetchLowStock, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [storeId]);

  return count;
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type MenuItem = Tables<"products"> & {
  stock_status: 'available' | 'low_stock' | 'out_of_stock';
};

export type MenuCategory = Tables<"product_types_config"> & {
  items: MenuItem[];
};

export function useDigitalMenu(storeId: string | null) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;

    const fetchMenuData = async () => {
      try {
        setLoading(true);
        // Fetch configs (Categories)
        const { data: configData } = await supabase
          .from("product_types_config")
          .select("*")
          .eq("active", true)
          .or(`store_id.eq.${storeId},store_id.is.null`);

        // Fetch products
        const { data: productsData } = await supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .or(`store_id.eq.${storeId},store_id.is.null`);

        // Fetch machine tanks (liquids)
        const { data: tanksData } = await supabase
          .from("machine_tanks")
          .select("*")
          .eq("store_id", storeId);

        // Fetch store stock (units)
        const { data: stockData } = await supabase
          .from("store_stock")
          .select("*")
          .eq("store_id", storeId);

        if (!isMounted) return;

        // Process data
        const processedCategories: MenuCategory[] = (configData || []).map(cat => {
          const catProducts = (productsData || []).filter(p => p.type === cat.code);
          
          const items: MenuItem[] = catProducts.map(prod => {
            let stock_status: 'available' | 'low_stock' | 'out_of_stock' = 'available';

            // Check if it relies on tanks (liquids)
            if (cat.track_mixture_inventory) {
               // Find associated tank via recipe or inventory_items logic
               // Simplified for prototype: we assume product relies on tanks if it's a liquid
               // In pekao, recipes map products to inventory_items, and tanks map to inventory_items
               // If a tank is low, stock is low.
               // We will use a mock logic here based on tanks for demonstration if recipe mapping isn't fully pulled:
               const relatedTanks = (tanksData || []).filter(t => t.current_volume_ml <= 1000); 
               if (relatedTanks.length > 0) {
                  stock_status = 'low_stock';
               }
               const emptyTanks = (tanksData || []).filter(t => t.current_volume_ml <= 200);
               if (emptyTanks.length > 0) {
                 // stock_status = 'out_of_stock'; // Real logic would map specific tank to specific product
               }
            } else {
               // Check store_stock
               const prodStock = (stockData || []).find(s => s.product_id === prod.id);
               if (prodStock) {
                 if (prodStock.qty === 0) stock_status = 'out_of_stock';
                 else if (prodStock.qty! <= (prodStock.min_qty || 10)) stock_status = 'low_stock';
               }
            }

            return {
              ...prod,
              stock_status
            };
          });

          return {
            ...cat,
            items
          };
        }).filter(cat => cat.items.length > 0);

        setCategories(processedCategories);
      } catch (error) {
        console.error("Error fetching menu data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMenuData();

    // Subscribe to realtime changes
    const channel = supabase.channel('menu_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'machine_tanks' }, fetchMenuData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_stock' }, fetchMenuData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchMenuData)
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  return { categories, loading };
}

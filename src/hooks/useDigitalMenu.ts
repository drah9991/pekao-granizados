import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

export type MenuItem = Tables<"products"> & {
  stock_status: 'available' | 'low_stock' | 'out_of_stock';
  available_qty: number;
  min_qty?: number;
};

export type MenuCategory = Tables<"product_types_config"> & {
  items: MenuItem[];
};

export type StoreOption = { id: string; name: string };
export type ProfileOption = { id: string; full_name: string | null; email: string | null };

export function useDigitalMenu(storeId: string | null, isAdminMode: boolean = false) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [storesList, setStoresList] = useState<StoreOption[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  // Lista de sucursales para el alternador responsive de cliente
  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase.from("stores").select("id, name").order("name");
      if (data) {
        setStoresList(data);
      }
    };
    fetchStores();
  }, []);

  // Perfiles de usuario disponibles para asignar notificaciones de pedidos
  useEffect(() => {
    if (!storeId) return;

    const fetchProfiles = async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      if (data) setProfiles(data);
    };
    fetchProfiles();
  }, [storeId]);

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

        // Fetch products with recipes & inventory_items
        let query = supabase
          .from("products")
          .select(`
            *,
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
          .eq("active", true)
          .or(`store_id.eq.${storeId},store_id.is.null`);

        // Si no está en modo admin, filtrar por los productos marcados como públicos (is_public = true)
        if (!isAdminMode) {
          query = query.eq("is_public", true);
        }

        const { data: productsData } = await query;

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
        let processedCategories: MenuCategory[] = (configData || []).map(cat => {
          const catProducts = (productsData || []).filter(p => p.type === cat.code);
          
          const items: MenuItem[] = catProducts.map(prod => {
            let stock_status: 'available' | 'low_stock' | 'out_of_stock' = 'available';
            let available_qty = 0;

            const prodStock = (stockData || []).find(s => s.product_id === prod.id);
            const min_qty = prodStock?.min_qty || 10;

            if (prodStock && prodStock.qty !== undefined && prodStock.qty !== null) {
              available_qty = prodStock.qty;
            } else if (prod.recipes && Array.isArray(prod.recipes) && prod.recipes.length > 0) {
              const recipe = prod.recipes[0] as any;
              if (recipe?.inventory_items?.stock !== undefined) {
                available_qty = recipe.inventory_items.stock;
              }
            }

            // Check if it relies on tanks (liquids)
            if (cat.track_mixture_inventory) {
               const relatedTanks = (tanksData || []).filter(t => t.current_volume_ml <= 1000); 
               if (relatedTanks.length > 0) {
                  stock_status = 'low_stock';
               }
               if (available_qty <= 0 && prodStock) {
                  stock_status = 'out_of_stock';
               }
            } else {
               if (available_qty <= 0) stock_status = 'out_of_stock';
               else if (available_qty <= min_qty) stock_status = 'low_stock';
            }

            return {
              ...prod,
              stock_status,
              available_qty,
              min_qty
            };
          });

          return {
            ...cat,
            items
          };
        }).filter(cat => cat.items.length > 0);

        // Sort categories by localStorage order
        const savedOrderStr = localStorage.getItem("pekao_menu_categories_order");
        if (savedOrderStr) {
          try {
            const savedOrder: string[] = JSON.parse(savedOrderStr);
            processedCategories.sort((a, b) => {
              const idxA = savedOrder.indexOf(a.code);
              const idxB = savedOrder.indexOf(b.code);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          } catch (e) {
            console.error("Error parsing saved categories order:", e);
          }
        }

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
  }, [storeId, isAdminMode]);

  const reorderCategories = (newCategories: MenuCategory[]) => {
    setCategories(newCategories);
    const codes = newCategories.map(cat => cat.code);
    localStorage.setItem("pekao_menu_categories_order", JSON.stringify(codes));
  };

  const toggleProductVisibility = async (productId: string, currentStatus: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_public: !currentStatus })
        .eq("id", productId);
        
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error toggling product visibility:", err);
      return false;
    }
  };

  return { categories, reorderCategories, toggleProductVisibility, loading, storesList, profiles };
}

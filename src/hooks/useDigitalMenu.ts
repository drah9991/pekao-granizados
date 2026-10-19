import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseRpc } from "@/integrations/supabase/types-extensions";
import {
  parsePublicMenu,
  sortByCategoryOrder,
  type MenuCategory,
  type MenuItem,
  type StockStatus,
} from "@/lib/digitalMenu";

export type { MenuCategory, MenuItem } from "@/lib/digitalMenu";

const CATEGORY_ORDER_KEY = "pekao_menu_categories_order";
/** La carta pública no recibe eventos en tiempo real (RLS); se refresca así. */
const PUBLIC_REFRESH_MS = 60_000;

function readSavedOrder(): string | null {
  try {
    return localStorage.getItem(CATEGORY_ORDER_KEY);
  } catch {
    return null;
  }
}

/**
 * Carta pública: la disponibilidad se calcula en el servidor (get_digital_menu),
 * así que anon nunca lee stock, recetas ni tanques directamente.
 */
async function fetchPublicMenu(storeId: string): Promise<MenuCategory[]> {
  const { data, error } = await supabaseRpc<unknown>("get_digital_menu", { p_store_id: storeId });
  if (error) throw error;
  return parsePublicMenu(data);
}

/** Vista de administración: personal con sesión, incluye productos no públicos. */
async function fetchAdminMenu(storeId: string): Promise<MenuCategory[]> {
  const [{ data: configData }, { data: productsData }, { data: tanksData }, { data: stockData }] = await Promise.all([
    supabase
      .from("product_types_config")
      .select("*")
      .eq("active", true)
      .or(`store_id.eq.${storeId},store_id.is.null`),
    supabase
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
      .or(`store_id.eq.${storeId},store_id.is.null`),
    supabase.from("machine_tanks").select("*").eq("store_id", storeId),
    supabase.from("store_stock").select("*").eq("store_id", storeId),
  ]);

  return (configData || [])
    .map((cat): MenuCategory => {
      const catProducts = (productsData || []).filter((p) => p.type === cat.code);

      const items: MenuItem[] = catProducts.map((prod) => {
        let stock_status: StockStatus = "available";
        let available_qty = 0;

        const prodStock = (stockData || []).find((s) => s.product_id === prod.id);
        const min_qty = prodStock?.min_qty || 10;

        if (prodStock && prodStock.qty !== undefined && prodStock.qty !== null) {
          available_qty = prodStock.qty;
        } else if (prod.recipes && Array.isArray(prod.recipes) && prod.recipes.length > 0) {
          const recipe = prod.recipes[0] as { inventory_items?: { stock?: number | null } | null } | undefined;
          const recipeStock = recipe?.inventory_items?.stock;
          if (recipeStock !== undefined && recipeStock !== null) {
            available_qty = recipeStock;
          }
        }

        // Check if it relies on tanks (liquids)
        if (cat.track_mixture_inventory) {
          const relatedTanks = (tanksData || []).filter((t) => t.current_volume_ml <= 1000);
          if (relatedTanks.length > 0) {
            stock_status = "low_stock";
          }
          if (available_qty <= 0 && prodStock) {
            stock_status = "out_of_stock";
          }
        } else {
          if (available_qty <= 0) stock_status = "out_of_stock";
          else if (available_qty <= min_qty) stock_status = "low_stock";
        }

        return {
          ...prod,
          stock_status,
          available_qty,
          min_qty,
        };
      });

      return { ...cat, items };
    })
    .filter((cat) => cat.items.length > 0);
}

export function useDigitalMenu(storeId: string | null, isAdminMode: boolean = false) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    let isMounted = true;

    const fetchMenuData = async () => {
      try {
        setLoading(true);
        const menu = isAdminMode ? await fetchAdminMenu(storeId) : await fetchPublicMenu(storeId);
        if (!isMounted) return;
        setCategories(sortByCategoryOrder(menu, readSavedOrder()));
      } catch (error) {
        console.error("Error fetching menu data:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMenuData();

    if (!isAdminMode) {
      const interval = setInterval(fetchMenuData, PUBLIC_REFRESH_MS);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    // Subscribe to realtime changes (staff session only)
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
    localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(codes));
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

  return { categories, reorderCategories, toggleProductVisibility, loading };
}

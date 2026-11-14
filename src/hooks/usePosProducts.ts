import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { offlineService } from "@/lib/OfflineService";
import type { Product } from "@/lib/pos-types";
import { mapProductStock } from "@/utils/productStockUtils";
import type { GridCategory } from "@/components/pos/product-grid/productFilter";

export type PosProduct = Product & { stock?: number; is_starred?: boolean | null };

interface CategoryRow {
  code: string;
  label: string;
  emoji_icon: string;
  color_theme: string;
  track_mixture_inventory: boolean;
  sales_mode: string;
  id: string;
}

/**
 * Forma de la caché ['products-grid', storeId]. usePOS, useProducts, useSales y usePrintCenter la
 * leen, la invalidan o la actualizan (p. ej. el stock optimista tras una venta): no cambiarla.
 */
interface GridData {
  products: PosProduct[];
  sizes: { id: string; name: string; multiplier: number }[];
  types: CategoryRow[];
  isOffline?: boolean;
}

const EMPTY: GridData = { products: [], sizes: [], types: [] };

async function fetchGrid(storeId: string): Promise<GridData> {
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
      .eq("active", true)
      .eq("store_id", storeId)
      .order("name", { ascending: true });

    if (error) throw error;

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .or(`store_id.eq.${storeId},store_id.is.null`)
      .order("sort_order", { ascending: true });

    const types: CategoryRow[] = (categoriesData || []).map((cat) => ({
      code: cat.id,
      label: cat.name,
      emoji_icon: cat.emoji_icon || "📦",
      color_theme: cat.color_theme || "bg-slate-500",
      track_mixture_inventory: cat.track_mixture_inventory || false,
      sales_mode: cat.sales_mode || "unit",
      id: cat.id,
    }));

    const typesForStock = types as unknown as Record<string, unknown>[];
    const products = (data || []).map((p: Record<string, unknown>) => mapProductStock(p, typesForStock)) as PosProduct[];

    const { data: sizesData } = await supabase.from("sizes").select("name, multiplier, id").eq("store_id", storeId);
    await offlineService.saveProducts(products as unknown as Record<string, unknown>[]);
    return { products, sizes: sizesData || [], types };
  } catch (error: unknown) {
    console.error("Error fetching products, checking offline:", error);
    const cached = await offlineService.getProducts();
    return { products: (cached || []) as PosProduct[], sizes: [], types: [], isOffline: true };
  }
}

/** Catálogo del POS: productos con stock, categorías y si se está usando la copia offline. */
export function usePosProducts(storeId: string | null | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["products-grid", storeId],
    queryFn: () => (storeId ? fetchGrid(storeId) : Promise.resolve(EMPTY)),
    enabled: !!storeId,
    refetchInterval: 60000,
    staleTime: 30_000, // 30s — POS grid, ya tiene refetchInterval 60s
  });

  const categories = useMemo<GridCategory[]>(
    () =>
      (data?.types ?? []).map((t) => ({
        code: t.code,
        label: t.label,
        emoji: t.emoji_icon,
        trackMixture: t.track_mixture_inventory,
      })),
    [data?.types],
  );

  return {
    products: data?.products ?? [],
    categories,
    isOffline: !!data?.isOffline,
    isLoading: isLoading || !data,
  };
}

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardRanges, transformDashboardData } from "@/utils/dashboardUtils";
import { DashboardConfig, defaultDashboardConfig } from "@/components/dashboard/DashboardCustomizer";
import { toast } from "sonner";

export function useDashboard(storeId: string | null) {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [uiConfig, setUiConfig] = useState<DashboardConfig>(defaultDashboardConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const ranges = useMemo(() => getDashboardRanges(period), [period]);

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["dashboard-v2-raw", storeId, period],
    queryFn: async () => {
      if (!storeId) return null;
      
      const { data: storeData } = await supabase
        .from('stores')
        .select('config')
        .eq('id', storeId)
        .single();
      
      if (storeData?.config && typeof storeData.config === 'object') {
          const savedConfig = (storeData.config as any).dashboard_v2;
          if (savedConfig) setUiConfig(savedConfig);
      }

      const [currentRes, comparisonRes, inventoryRes, sizesRes, expensesRes] = await Promise.all([
        supabase.from("orders").select("id, total, subtotal, tip_amount, delivery_fee, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end),
        supabase.from("orders").select("total, status").eq("store_id", storeId).gte("created_at", ranges.comparison.start).lte("created_at", ranges.comparison.end),
        (supabase as any).from("inventory_items").select("name, stock, min_stock, is_mixture").eq("store_id", storeId),
        supabase.from("sizes").select("name, multiplier").eq("store_id", storeId),
        supabase.from("expenses").select("amount, expense_date").eq("store_id", storeId).gte("expense_date", ranges.current.start).lte("expense_date", ranges.current.end)
      ]);

      if (currentRes.error) {
        if (currentRes.error.message?.includes("delivery_fee")) {
          const fallback = await supabase.from("orders").select("id, total, subtotal, tip_amount, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end);
          if (fallback.error) throw fallback.error;
          currentRes.data = fallback.data as any;
        } else {
          throw currentRes.error;
        }
      }

      return {
        orders: currentRes.data || [],
        comparisonOrders: comparisonRes.data || [],
        inventory: inventoryRes.data || [],
        sizes: sizesRes.data || [],
        expenses: expensesRes.data || []
      };
    },
    enabled: !!storeId,
    refetchInterval: 30000,
  });

  const dashboardData = useMemo(() => {
    if (!rawData) return null;
    const transformed = transformDashboardData(rawData.orders, rawData.comparisonOrders, rawData.expenses);
    const lowStock = rawData.inventory.filter((item: any) => 
      item.stock <= (item.min_stock || 0) || item.is_mixture
    );

    return {
      ...transformed,
      lowStock,
      sizes: rawData.sizes
    };
  }, [rawData]);

  const handleSaveConfig = async () => {
    if (!storeId) return;
    setIsSavingConfig(true);
    try {
        const { data: currentStore } = await supabase.from('stores').select('config').eq('id', storeId).single();
        const newConfig = {
            ...(currentStore?.config as any || {}),
            dashboard_v2: uiConfig
        };

        const { error } = await supabase.from('stores').update({ config: newConfig }).eq('id', storeId);
        if (error) throw error;
        toast.success("Dashboard parametrizado con éxito");
    } catch (err: any) {
        console.error("Error saving dashboard config:", err);
        toast.error("Fallo en persistencia: " + err.message);
    } finally {
        setIsSavingConfig(false);
    }
  };

  const comparisonLabel = period === 'today' ? 'ayer' : (period === 'week' ? 'sem. pasada' : (period === 'month' ? 'mes pasado' : 'año pasado'));

  return {
    period,
    setPeriod,
    uiConfig,
    setUiConfig,
    isSavingConfig,
    isLoading: isLoading && !dashboardData,
    error,
    dashboardData,
    comparisonLabel,
    handleSaveConfig
  };
}

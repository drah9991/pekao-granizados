import { useState, useMemo, useEffect, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardRanges, transformDashboardData } from "@/utils/dashboardUtils";
import { DashboardConfig, defaultDashboardConfig } from "@/components/dashboard/DashboardCustomizer";
import { toast } from "sonner";

export function useDashboard(storeId: string | null) {
  const [period, setPeriodInternal] = useState<"today" | "week" | "month" | "year">("today");
  const [uiConfig, setUiConfigInternal] = useState<DashboardConfig>(defaultDashboardConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  const setPeriod = (newPeriod: "today" | "week" | "month" | "year") => {
    startTransition(() => {
      setPeriodInternal(newPeriod);
    });
  };

  const setUiConfig = (newConfig: DashboardConfig) => {
    startTransition(() => {
      setUiConfigInternal(newConfig);
    });
  };

  const ranges = useMemo(() => getDashboardRanges(period), [period]);

  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`dashboard-sync-${storeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => {
          // Usamos refetchQueries para asegurar que se dispare la recarga inmediata
          queryClient.refetchQueries({ 
            queryKey: ["dashboard-v2-raw", storeId],
            type: 'active'
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.refetchQueries({ 
            queryKey: ["dashboard-v2-raw", storeId],
            type: 'active'
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `store_id=eq.${storeId}` },
        () => {
          queryClient.refetchQueries({ 
            queryKey: ["dashboard-v2-raw", storeId],
            type: 'active'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["dashboard-v2-raw", storeId, period],
    queryFn: async () => {
      if (!storeId) return null;
      
      const { data: storeData } = await supabase
        .from('stores')
        .select('config')
        .eq('id', storeId)
        .single();
        
      const savedConfig = storeData?.config && typeof storeData.config === 'object' 
        ? (storeData.config as Record<string, unknown>).dashboard_v2 
        : null;

      const [currentRes, comparisonRes, inventoryRes, sizesRes, expensesRes] = await Promise.all([
        supabase.from("orders").select("id, total, subtotal, tip_amount, delivery_fee, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end),
        supabase.from("orders").select("total, status").eq("store_id", storeId).gte("created_at", ranges.comparison.start).lte("created_at", ranges.comparison.end),
        supabase.from("inventory_items").select("name, stock, min_stock, is_mixture").eq("store_id", storeId),
        supabase.from("sizes").select("name, multiplier").eq("store_id", storeId),
        supabase.from("expenses").select("amount, expense_date").eq("store_id", storeId).gte("expense_date", ranges.current.start).lte("expense_date", ranges.current.end)
      ]);

      if (currentRes.error) {
        if (currentRes.error.message?.includes("delivery_fee")) {
          const fallback = await supabase.from("orders").select("id, total, subtotal, tip_amount, status, created_at, payment, order_items(qty, name, price)").eq("store_id", storeId).gte("created_at", ranges.current.start).lte("created_at", ranges.current.end);
          if (fallback.error) throw fallback.error;
          currentRes.data = fallback.data as typeof currentRes.data;
        } else {
          throw currentRes.error;
        }
      }

      return {
        orders: currentRes.data || [],
        comparisonOrders: comparisonRes.data || [],
        inventory: inventoryRes.data || [],
        sizes: sizesRes.data || [],
        expenses: expensesRes.data || [],
        config: savedConfig
      };
    },
    enabled: !!storeId,
    refetchInterval: 1000 * 60 * 5, // Fallback polling every 5 minutes
    staleTime: 0, // Force refetch on mount to show fresh POS sales
  });

  // Sincronizar configuración guardada solo cuando cambia el store o carga inicial
  useEffect(() => {
    if (rawData?.config) {
      setUiConfigInternal(rawData.config);
    }
  }, [rawData?.config]);

  const dashboardData = useMemo(() => {
    if (!rawData) return null;
    const transformed = transformDashboardData(rawData.orders, rawData.comparisonOrders, rawData.expenses);
    const lowStock = rawData.inventory.filter((item: Record<string, unknown>) => 
      Number(item.stock) <= (Number(item.min_stock) || 0) || Boolean(item.is_mixture)
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
        const currentConfig = (currentStore?.config as Record<string, unknown>) || {};
        const newConfig = {
            ...currentConfig,
            dashboard_v2: uiConfig
        };

        const { error } = await supabase.from('stores').update({ config: newConfig }).eq('id', storeId);
        if (error) throw error;
        toast.success("Dashboard parametrizado con éxito");
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        console.error("Error saving dashboard config:", err);
        toast.error("Fallo en persistencia: " + msg);
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
    isPending,
    error,
    dashboardData,
    comparisonLabel,
    handleSaveConfig
  };
}

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardRanges, transformDashboardData } from "@/utils/dashboardUtils";
import { DashboardConfig, defaultDashboardConfig } from "@/components/dashboard/DashboardCustomizer";
import { toast } from "sonner";

export function useDashboard(storeId: string | null) {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [uiConfig, setUiConfig] = useState<DashboardConfig>(defaultDashboardConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const queryClient = useQueryClient();

  const ranges = useMemo(() => getDashboardRanges(period), [period]);

  useEffect(() => {
    if (!storeId) return;

    console.log("Iniciando suscripción Realtime para Dashboard. StoreId:", storeId);

    const channel = supabase
      .channel('dashboard-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          console.log("Evento recibido: orders", payload);
          queryClient.invalidateQueries({ queryKey: ["dashboard-v2-raw", storeId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter: `store_id=eq.${storeId}` },
        (payload) => {
          console.log("Evento recibido: inventory_items", payload);
          queryClient.invalidateQueries({ queryKey: ["dashboard-v2-raw", storeId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `store_id=eq.${storeId}` },
        (payload) => {
          console.log("Evento recibido: expenses", payload);
          queryClient.invalidateQueries({ queryKey: ["dashboard-v2-raw", storeId] });
        }
      )
      .subscribe((status) => {
        console.log("Estado suscripción Dashboard:", status);
        if (status === 'CHANNEL_ERROR') {
          console.error("Error en el canal de Dashboard Realtime. Verifique configuración de Supabase.");
        }
      });

    return () => {
      console.log("Limpiando suscripción Dashboard");
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
        ? (storeData.config as any).dashboard_v2 
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
      setUiConfig(rawData.config);
    }
  }, [rawData?.config]);

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

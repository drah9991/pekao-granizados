import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useTurn } from "@/hooks/useTurn";
import { useEffect } from "react";
import { toast } from "sonner";

export interface TankStatus {
  id: string;
  store_id: string;
  name: string;
  current_volume_ml: number;
  max_capacity_ml: number;
  percentage: number;
  updated_at: string;
  inventory_item_id: string | null;
}

export function useTankStatus(customStoreId?: string | null) {
  const { storeId: authStoreId } = useAuth();
  const { activeTurn } = useTurn();
  const queryClient = useQueryClient();

  const storeId = customStoreId !== undefined ? customStoreId : authStoreId;

  const queryKey = ['tank-status', storeId, activeTurn?.id, activeTurn?.status];

  console.log("[useTankStatus Hook] Current storeId:", storeId, "activeTurn:", activeTurn?.id, "status:", activeTurn?.status);

  const query = useQuery<TankStatus[]>({
    queryKey,
    queryFn: async () => {
      if (!storeId) {
        console.warn("[useTankStatus Hook] No storeId available, skipping query.");
        return [];
      }

      try {
        console.log("[useTankStatus Hook] Fetching tank status from Supabase for storeId:", storeId);
        const { data, error } = await supabase
          .from('vw_tank_percentages' as unknown as 'inventory_items')
          .select('*')
          .eq('store_id', storeId)
          .order('name', { ascending: true });

        if (error) {
          // If the view or table doesn't exist yet, catch it gracefully
          if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
            console.warn("[useTankStatus Hook] Table/View vw_tank_percentages does not exist yet. Run migrations.");
            return [];
          }
          throw error;
        }

        console.log("[useTankStatus Hook] Successfully fetched tanks:", data);
        return data as TankStatus[];
      } catch (err) {
        console.error("[useTankStatus Hook] Error fetching tank status:", err);
        return [];
      }
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 30,
  });

  // Reconnection invalidation
  useEffect(() => {
    const handleOnline = () => {
      queryClient.invalidateQueries({ queryKey: ['tank-status'] });
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient]);

  return query;
}

export function useInitializeTanks(customStoreId?: string | null) {
  const { storeId: authStoreId } = useAuth();
  const queryClient = useQueryClient();
  const storeId = customStoreId !== undefined ? customStoreId : authStoreId;

  return useMutation({
    mutationFn: async () => {
      if (!storeId) throw new Error("No store selected");
      
      const { data, error } = await supabase.rpc('initialize_store_tanks', {
        p_store_id: storeId
      });

      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['tank-status'] });
      toast.success(`Se inicializaron ${count} tanques de mezcla para esta sucursal.`);
    },
    onError: (error: any) => {
      console.error("Error initializing tanks:", error);
      toast.error(`Error al inicializar tanques: ${error.message || 'Error desconocido'}`);
    }
  });
}


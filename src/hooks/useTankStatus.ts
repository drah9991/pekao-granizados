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

  const query = useQuery<TankStatus[]>({
    queryKey,
    queryFn: async () => {
      if (!storeId) {
        return [];
      }

      try {
        const { data, error } = await (supabase
          .from('vw_tank_percentages') as ReturnType<typeof supabase.from<'inventory_items'>>)
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

        return data as TankStatus[];
      } catch (err) {
        console.error("[useTankStatus Hook] Error fetching tank status:", err);
        return [];
      }
    },
    enabled: !!storeId,
    staleTime: 1000 * 2, // 2 seconds cache (highly reactive)
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

  // Real-time subscription for machine_tanks changes to update POS instantly
  useEffect(() => {
    if (!storeId) return;

    const tanksChannel = supabase
      .channel(`machine-tanks-sync-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tank-status'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tanksChannel);
    };
  }, [storeId, queryClient]);

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
    onError: (error: unknown) => {
      console.error("Error initializing tanks:", error);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al inicializar tanques: ${msg}`);
    }
  });
}


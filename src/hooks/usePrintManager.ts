import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PrintJob {
  id: string;
  origin: string;
  impressions: number;
  price: number;
  time: string;
  rawOrder?: any;
}

interface UsePrintManagerParams {
  storeId?: string;
  activeTurn: any;
  selectedTurnId: string;
}

/**
 * Encapsula el acceso a datos del Centro de Copiado (Print Center):
 * - Historial de turnos para el selector de turnos.
 * - Historial de órdenes de impresión del turno seleccionado.
 * - Anulación de trabajos de impresión (RPC con restauración de stock).
 */
export function usePrintManager({ storeId, activeTurn, selectedTurnId }: UsePrintManagerParams) {
  const queryClient = useQueryClient();
  const [turnsHistory, setTurnsHistory] = useState<any[]>([]);

  // Cargar historial de turnos para el selector
  useEffect(() => {
    const fetchTurns = async () => {
      if (!storeId) return;
      const { data, error } = await supabase
        .from("cash_turns")
        .select("*, profiles:cashier_id(name)")
        .eq("store_id", storeId)
        .order("opened_at", { ascending: false })
        .limit(30);
      if (!error && data) {
        setTurnsHistory(data);
      }
    };
    fetchTurns();
  }, [storeId]);

  const targetTurn = useMemo(() => {
    if (selectedTurnId === "active") {
      return activeTurn;
    }
    return turnsHistory.find(t => t.id === selectedTurnId);
  }, [selectedTurnId, activeTurn, turnsHistory]);

  // Historial desde Supabase (sólo las de este turno/tienda y origen print_center)
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['print-center-history', targetTurn?.id, selectedTurnId],
    queryFn: async () => {
      if (!targetTurn) return [];

      let query = supabase
        .from('orders')
        .select(`
          id,
          total,
          created_at,
          payment,
          status,
          order_items (
            name,
            qty
          )
        `)
        .eq('store_id', storeId || '')
        .gte('created_at', targetTurn.opened_at);

      if (targetTurn.closed_at) {
        query = query.lte('created_at', targetTurn.closed_at);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching print history:", error);
        return [];
      }

      // Filtrar por tag metadata (origin: 'print_center')
      const printOrders = (data || []).filter(order => {
        let p = order.payment;
        if (typeof p === 'string') {
          try {
            p = JSON.parse(p);
          } catch (_) {
            return false;
          }
        }
        return p && (p as any).origin === 'print_center';
      });

      return printOrders.map(order => {
        let p = order.payment;
        if (typeof p === 'string') {
          try {
            p = JSON.parse(p);
          } catch (_) {}
        }
        const payObj = (p || {}) as any;
        return {
          id: order.id,
          origin: payObj.copy_origin || 'Desconocido',
          impressions: payObj.copy_pages || 1,
          price: order.total,
          time: new Date(order.created_at).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
          rawOrder: {
            ...order,
            payment_method: payObj.method || 'cash', // Se extrae del JSON payment
            status: order.status
          }
        } as PrintJob;
      });
    },
    enabled: !!activeTurn && !!storeId
  });

  const handleCancelJob = async (job: PrintJob) => {
    if (!confirm('¿Estás seguro de que deseas anular este registro de impresión? Esto restará el dinero de tu caja.')) return;

    try {
      const { error } = await supabase.rpc('cancel_sale_with_stock_restore', {
        p_order_id: job.id,
        p_reason: 'Anulación manual desde Centro de Copiado'
      });

      if (error) throw error;

      toast.success('Registro anulado correctamente');
      refetchHistory();
      // Invalidate global sales query to update dashboard
      queryClient.invalidateQueries({ queryKey: ["dashboard-v2-raw"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["products-grid"] });
      queryClient.invalidateQueries({ queryKey: ["tank-status"] });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al anular: ' + (err.message || 'Desconocido'));
    }
  };

  return {
    turnsHistory,
    history,
    refetchHistory,
    handleCancelJob
  };
}

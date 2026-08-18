import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useTurn } from '@/hooks/useTurn';
import { useConfigStore } from '@/store/useConfigStore';
import { usePOS } from '@/hooks/usePOS';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Interfaces estrictas para el módulo
export type OriginType = 'whatsapp' | 'physical' | 'scanner';
export type ColorMode = 'bw' | 'color';
export type PaperSize = 'letter' | 'legal';

export interface PrintJob {
  id: string;
  origin: string;
  impressions: number;
  price: number;
  time: string;
  rawOrder?: any;
}

/**
 * Hook con toda la lógica de estado y datos del módulo Print Center,
 * extraído de src/pages/PrintManagerModule.tsx sin cambios de
 * comportamiento.
 */
export function usePrintCenter() {
  const { user, userRole } = useAuth();
  const { activeTurn } = useTurn();

  const storeConfig = useConfigStore((state) => state.storeConfig) as Record<string, any>;
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const pricing = storeConfig?.copyCenter?.pricing || {
    print: { bw_letter: 500, bw_legal: 500, color_letter: 1000, color_legal: 1200 },
    copy: { bw_letter: 300, bw_legal: 500, color_letter: 1000, color_legal: 1200, cedula: 1000 },
    scanner: 500
  };

  // Estados del formulario
  const [origin, setOrigin] = useState<OriginType>('whatsapp');
  const [colorMode, setColorMode] = useState<ColorMode>('bw');
  const [paperSize, setPaperSize] = useState<PaperSize>('letter');
  const [pages, setPages] = useState<number>(1);
  const [sets, setSets] = useState<number>(1);
  const [isCedula, setIsCedula] = useState<boolean>(false);
  const [cedulaQty, setCedulaQty] = useState<number>(1);
  const [isCopia, setIsCopia] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyPageSize = 10;

  const [selectedTurnId, setSelectedTurnId] = useState<string>("active");
  const [turnsHistory, setTurnsHistory] = useState<any[]>([]);

  const queryClient = useQueryClient();
  const { processSale } = usePOS();

  // Cargar historial de turnos para el selector
  React.useEffect(() => {
    const fetchTurns = async () => {
      if (!user?.store_id) return;
      const { data, error } = await supabase
        .from("cash_turns")
        .select("*, profiles:cashier_id(name)")
        .eq("store_id", user.store_id)
        .order("opened_at", { ascending: false })
        .limit(30);
      if (!error && data) {
        setTurnsHistory(data);
      }
    };
    fetchTurns();
  }, [user?.store_id]);

  const targetTurn = useMemo(() => {
    if (selectedTurnId === "active") {
      return activeTurn;
    }
    return turnsHistory.find(t => t.id === selectedTurnId);
  }, [selectedTurnId, activeTurn, turnsHistory]);

  // Cargar configuración de la sucursal al montar el módulo
  React.useEffect(() => {
    if (user?.store_id) {
      fetchConfig(user.store_id);
    }
  }, [user?.store_id, fetchConfig]);

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
        .eq('store_id', user?.store_id || '')
        .gte('created_at', targetTurn.opened_at);

      if (targetTurn.closed_at) {
        query = query.lte('created_at', targetTurn.closed_at);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching print history:", error);
        return [];
      }

      console.log("DEBUG Print Center: all fetched orders for shift:", data);

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
          } catch (parseError) {
            console.error("Error parsing payment metadata for order", order.id, parseError);
            p = {};
          }
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
    enabled: !!activeTurn && !!user?.store_id
  });

  // Reset Cédula and Copia check if origin is not physical
  React.useEffect(() => {
    if (origin !== 'physical') {
      setIsCedula(false);
      setIsCopia(true);
    }
  }, [origin]);

  // OPTIMIZACIÓN: Estado derivado puro y síncrono mediante useMemo
  const { totalImpressions, totalPrice } = useMemo(() => {
    let pricePerPage = 0;

    if (origin === 'scanner') {
      pricePerPage = pricing.scanner; // Tarifa dinámica escáner
    } else {
      const activeMatrix = origin === 'physical' ? pricing.copy : pricing.print;
      if (colorMode === 'bw') {
        pricePerPage = paperSize === 'letter' ? activeMatrix.bw_letter : activeMatrix.bw_legal;
      } else {
        pricePerPage = paperSize === 'letter' ? activeMatrix.color_letter : activeMatrix.color_legal;
      }
    }

    let impressions = 0;
    let price = 0;

    if (origin === 'physical') {
      if (isCopia) {
        impressions += Math.max(0, pages) * Math.max(0, sets);
        price += Math.max(0, pages) * Math.max(0, sets) * pricePerPage;
      }
      if (isCedula) {
        impressions += Math.max(0, cedulaQty);
        price += Math.max(0, cedulaQty) * (pricing.copy?.cedula ?? 1000);
      }
    } else {
      // whatsapp or scanner
      impressions = Math.max(0, pages) * Math.max(0, sets);
      price = impressions * pricePerPage;
    }

    return {
      totalImpressions: impressions,
      totalPrice: price
    };
  }, [origin, colorMode, paperSize, pages, sets, pricing, isCedula, cedulaQty, isCopia]);

  // Rendimiento total acumulado en el turno (excluye anuladas)
  const totalTurnImpressions = useMemo(() => {
    return history
      .filter(job => job.rawOrder?.status !== 'cancelled')
      .reduce((acc, job) => acc + job.impressions, 0);
  }, [history]);

  // Paginación local del historial
  const historyTotalPages = Math.max(1, Math.ceil(history.length / historyPageSize));
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    if (start >= history.length) {
      return history.slice(0, historyPageSize);
    }
    return history.slice(start, start + historyPageSize);
  }, [history, historyPage, historyPageSize]);

  React.useEffect(() => {
    if (historyPage > historyTotalPages || historyPage < 1) {
      setHistoryPage(1);
    }
  }, [history.length, historyTotalPages, historyPage]);

  // Manejadores de adición rápida (Fast-add)
  const handleFastAdd = (amount: number) => {
    setPages((prev) => Math.max(1, (prev <= 0 ? 0 : prev) + amount));
  };

  // Procesamiento, Facturación y Copiado automatizado
  const handleProcessAndBill = async () => {
    // AUDITORÍA DE SEGURIDAD: Validación de roles en tiempo de ejecución
    if (!user || (userRole !== 'cashier' && userRole !== 'admin' && userRole !== 'manager')) {
      toast.error('Acceso denegado: Permisos insuficientes para facturar.');
      return;
    }

    if (!activeTurn || activeTurn.status === 'paused') {
      toast.error('Operación bloqueada: Requiere un turno de caja activo.');
      return;
    }

    if (origin === 'physical') {
      if (!isCopia && !isCedula) {
        toast.error('Debe seleccionar al menos un servicio (Cédula o Copia).');
        return;
      }
      if (isCopia && (pages <= 0 || sets <= 0)) {
        toast.error('La cantidad de páginas y juegos para copias debe ser mayor a cero.');
        return;
      }
      if (isCedula && cedulaQty <= 0) {
        toast.error('La cantidad de cédulas debe ser mayor a cero.');
        return;
      }
    } else {
      if (pages <= 0 || sets <= 0) {
        toast.error('La cantidad de páginas y juegos debe ser mayor a cero.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      let formattedOriginName = '';
      if (origin === 'whatsapp') {
        formattedOriginName = 'Impresión WhatsApp/USB';
      } else if (origin === 'scanner') {
        formattedOriginName = 'Escáner';
      } else {
        const parts = [];
        if (isCopia) parts.push('Copia Física');
        if (isCedula) parts.push(`Cédula (x${cedulaQty})`);
        formattedOriginName = parts.join(' + ') || 'Copia Vacía';
      }

      const dummyCart = [{
        productId: 'generic-copy-service',
        quantity: 1,
        price: totalPrice,
        name: `Servicio Centro de Copiado (${formattedOriginName})`,
        sizeMultiplier: 1,
        baseVolume: 0,
        toppings: []
      }];

      const orderResult = await processSale(
        dummyCart,
        totalPrice, // saleTotal
        totalPrice, // saleSubtotal
        0, // discountAmount
        null, // customer
        paymentMethod, // payment method
        totalPrice, // amountReceived
        undefined, // deliveryData
        undefined, // splitDetails
        {
          origin: 'print_center',
          copy_origin: formattedOriginName,
          copy_pages: totalImpressions,
          is_cedula: isCedula,
          cedula_qty: isCedula ? cedulaQty : 0,
          is_copia: isCopia
        } // metadata
      );

      if (orderResult) {
        // Generación de mensaje automatizado para el portapapeles
        const whatsappMessage = `¡Hola! Tu documento está listo. El total de tus ${totalImpressions} páginas es de $${totalPrice.toLocaleString('es-CO')}. Puedes pasar a caja.`;
        await navigator.clipboard.writeText(whatsappMessage).catch(() => console.log('Clipboard no disponible'));

        toast.success('Servicio facturado correctamente en la caja global', {
          className: 'border-emerald-500/40 bg-slate-950 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
        });

        // Resetear formulario
        setPages(1);
        setSets(1);
        setCedulaQty(1);

        // Refrescar historial
        refetchHistory();
      }
    } catch (error) {
      toast.error('Error crítico al registrar el trabajo de impresión.');
    } finally {
      setIsProcessing(false);
    }
  };

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
    user, userRole, activeTurn, pricing,
    origin, setOrigin,
    colorMode, setColorMode,
    paperSize, setPaperSize,
    pages, setPages,
    sets, setSets,
    isCedula, setIsCedula,
    cedulaQty, setCedulaQty,
    isCopia, setIsCopia,
    paymentMethod, setPaymentMethod,
    isProcessing,
    historyPage, setHistoryPage,
    historyPageSize,
    selectedTurnId, setSelectedTurnId,
    turnsHistory,
    history,
    totalImpressions,
    totalPrice,
    totalTurnImpressions,
    historyTotalPages,
    paginatedHistory,
    handleFastAdd,
    handleProcessAndBill,
    handleCancelJob,
  };
}

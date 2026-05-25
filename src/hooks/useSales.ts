import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrderWithDetails, OrderStatus, OrderItem } from "@/types/sales";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { DateRange } from "react-day-picker";
import { playNewOrderSound, forceAudioUnlock } from "@/utils/audio";

export function useSales() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<OrderStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  }));
  const [quickFilter, setQuickFilter] = useState<string>("week");
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Audio preference state
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kds_audio_enabled");
      return saved !== "false";
    }
    return true;
  });

  // Dialog State
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    async function fetchStoreId() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
      if (profile?.store_id) setStoreId(profile.store_id);
    }
    fetchStoreId();
  }, []);

  const fetchOrders = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          items:order_items(*),
          creator_profile:profiles!orders_created_by_fkey(name),
          customer_details:customers!orders_customer_id_fkey(name, document_id, email, phone)
        `)
        .eq('store_id', storeId)
        .order("created_at", { ascending: false });

      if (selectedStatusFilter !== "all") {
        query = query.eq("status", selectedStatusFilter);
      }

      if (dateRange?.from) {
        query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
        if (dateRange.to) {
          query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
        } else {
          query = query.lte('created_at', endOfDay(dateRange.from).toISOString());
        }
      }

      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;
      setOrders((data as unknown as OrderWithDetails[]) || []);
    } catch (error: any) {
      toast.error("Error al cargar ventas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, selectedStatusFilter, dateRange]);

  // Realtime subscription for incoming orders to trigger KDS audio notifications
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`kds-orders-sync-${storeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        (payload) => {
          const audioSaved = localStorage.getItem('kds_audio_enabled') !== 'false';
          if (audioSaved) {
            playNewOrderSound();
          }
          // Refresh list immediately in the background
          fetchOrders();
          // Notify the user visually
          toast.success(`Nuevo pedido recibido: #${payload.new.id.slice(0, 8).toUpperCase()}`, {
            icon: "🔔"
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId]);

  const toggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("kds_audio_enabled", next ? "true" : "false");
      toast.info(next ? "Audio de cocina habilitado" : "Audio de cocina silenciado", {
        icon: next ? "🔊" : "🔇"
      });
      return next;
    });
  };

  const testAudioChime = async () => {
    const success = await forceAudioUnlock();
    if (success) {
      toast.success("Sonido de prueba reproducido con éxito", { icon: "🔊" });
    } else {
      toast.error("El audio está suspendido. Haga clic aquí para interactuar con la página y probar de nuevo.", { icon: "🚫" });
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchQuery ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.creator_profile?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_details?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [orders, searchQuery]);

  const stats = useMemo(() => {
    const filtered = filteredOrders.filter(o => o.status === 'completed');
    const total = filtered.reduce((sum, o) => sum + o.total, 0);
    const count = filtered.length;
    const pendingCount = filteredOrders.filter(o => o.status === 'pending').length;
    return {
      totalRevenue: total,
      completedCount: count,
      pendingCount,
      avgTicket: count > 0 ? Math.round(total / count) : 0,
      totalCount: filteredOrders.length
    };
  }, [filteredOrders]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: filteredOrders.length };
    filteredOrders.forEach(o => {
      counts[o.status as string] = (counts[o.status as string] || 0) + 1;
    });
    return counts;
  }, [filteredOrders]);

  const handleQuickFilterChange = (value: string) => {
    setQuickFilter(value);
    const now = new Date();
    switch (value) {
      case "today": setDateRange({ from: startOfDay(now), to: endOfDay(now) }); break;
      case "week": setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }); break;
      case "month": setDateRange({ from: startOfMonth(now), to: endOfMonth(now) }); break;
      case "year": setDateRange({ from: startOfYear(now), to: endOfYear(now) }); break;
      case "all": setDateRange(undefined); break;
    }
  };

  const handleUpdateOrder = async (orderId: string, updates: Partial<OrderWithDetails>) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Orden actualizada correctamente");
      fetchOrders();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: any) {
      toast.error("Error al actualizar: " + error.message);
    }
  };

  const handleViewDetails = (order: OrderWithDetails) => {
    toast("Abriendo detalles de orden: " + order.id);
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleEdit = (order: OrderWithDetails) => {
    toast("Abriendo edición de orden: " + order.id);
    setSelectedOrder(order);
    setIsEditOpen(true);
  };

  const handleCancelClick = (order: OrderWithDetails) => {
    toast("Abriendo cancelación de orden: " + order.id);
    setSelectedOrder(order);
    setIsCancelOpen(true);
  };

  const handleConfirmCancelWithReason = async (order: OrderWithDetails, reason: string) => {
    try {
      const { error } = await supabase.rpc('cancel_sale_with_stock_restore', {
        p_order_id: order.id,
        p_reason: reason
      });
      if (error) throw error;
      toast.success("Venta cancelada y stock restaurado correctamente");
      setIsCancelOpen(false);
      setSelectedOrder(null);
      fetchOrders();
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error: any) {
      toast.error("Error al cancelar: " + error.message);
    }
  };

  return {
    orders,
    filteredOrders,
    loading,
    searchQuery,
    setSearchQuery,
    selectedStatusFilter,
    setSelectedStatusFilter,
    dateRange,
    setDateRange,
    quickFilter,
    handleQuickFilterChange,
    stats,
    statusCounts,
    refreshOrders: fetchOrders,
    isAudioEnabled,
    toggleAudio,
    testAudioChime,
    dialogs: {
      selectedOrder,
      isDetailsOpen,
      setIsDetailsOpen,
      isCancelOpen,
      setIsCancelOpen,
      isEditOpen,
      setIsEditOpen,
      handleViewDetails,
      handleEdit,
      handleCancelClick,
      handleUpdateOrder,
      handleConfirmCancel: handleConfirmCancelWithReason
    }
  };
}


import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrderWithDetails, OrderStatus, OrderItem } from "@/types/sales";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { DateRange } from "react-day-picker";
import { playNewOrderSound, forceAudioUnlock } from "@/utils/audio";

function getMockOrders(storeId: string | null): OrderWithDetails[] {
  const now = new Date();
  const today = now.toISOString();
  const todayMinus3h = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
  const yesterday = new Date(now.getTime() - 25 * 3600 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000).toISOString();
  const threeDaysAgo = new Date(now.getTime() - 72 * 3600 * 1000).toISOString();

  return [
    {
      id: "sale-f7a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
      store_id: storeId || "default-store",
      created_at: today,
      total: 24500,
      subtotal: 24500,
      status: "completed",
      payment_method: "nequi",
      order_type: "pickup",
      delivery_fee: 0,
      tip_amount: 0,
      payment: { method: "nequi" },
      creator_profile: { name: "Valentina Ospina" },
      customer_details: {
        name: "Carlos Andrés Mendoza",
        phone: "3124567890",
        email: "carlos.mendoza@gmail.com",
        document_id: "1020304050"
      },
      items: [
        { id: "item-1", name: "Granizado Limonada de Coco", qty: 2, price: 8500, size: "12oz", size_multiplier: 1.2 },
        { id: "item-2", name: "Granizado Fresa Especial", qty: 1, price: 7500, size: "10oz", size_multiplier: 1.0 }
      ]
    },
    {
      id: "sale-8f9e0d1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
      store_id: storeId || "default-store",
      created_at: todayMinus3h,
      total: 38000,
      subtotal: 35000,
      status: "processing",
      payment_method: "tarjeta",
      order_type: "delivery",
      delivery_fee: 3000,
      delivery_address: "Calle 45 # 82 - 12 Apt 402, Belén",
      delivery_phone: "3159876543",
      payment: { method: "credit_card" },
      creator_profile: { name: "Mateo Silva" },
      customer_details: {
        name: "María Camila Restrepo",
        phone: "3159876543",
        email: "camila.restrepo@outlook.com",
        document_id: "1032456789"
      },
      items: [
        { id: "item-3", name: "Granizado Maracuyá con Vodka", qty: 2, price: 12000, size: "14oz", size_multiplier: 1.4 },
        { id: "item-4", name: "Granizado Mango Biche con Chamoy", qty: 1, price: 11000, size: "12oz", size_multiplier: 1.2 }
      ]
    },
    {
      id: "sale-4b5c6d7e-8f9a-0b1c-2d3e-4f5a6b7c8d9e",
      store_id: storeId || "default-store",
      created_at: yesterday,
      total: 19000,
      subtotal: 19000,
      status: "pending",
      payment_method: "daviplata",
      order_type: "pickup",
      payment: { method: "daviplata" },
      creator_profile: { name: "Andrés Felipe Castro" },
      customer_details: {
        name: "Juan Sebastián Gómez",
        phone: "3201234567",
        email: "juan.gomez@hotmail.com"
      },
      items: [
        { id: "item-5", name: "Granizado Baileys & Café", qty: 1, price: 10500, size: "12oz", size_multiplier: 1.2 },
        { id: "item-6", name: "Granizado Fresa Especial", qty: 1, price: 8500, size: "12oz", size_multiplier: 1.2 }
      ]
    },
    {
      id: "sale-7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d",
      store_id: storeId || "default-store",
      created_at: twoDaysAgo,
      total: 17000,
      subtotal: 17000,
      status: "completed",
      payment_method: "efectivo",
      order_type: "pickup",
      payment: { method: "cash" },
      creator_profile: { name: "Valentina Ospina" },
      customer_details: {
        name: "Santiago Valencia",
        phone: "3104445566"
      },
      items: [
        { id: "item-7", name: "Granizado Limonada de Coco", qty: 2, price: 8500, size: "12oz", size_multiplier: 1.2 }
      ]
    },
    {
      id: "sale-3d4e5f6a-7b8c-9d0e-1f2a-3b4c5d6e7f8a",
      store_id: storeId || "default-store",
      created_at: threeDaysAgo,
      total: 22000,
      subtotal: 22000,
      status: "cancelled",
      payment_method: "efectivo",
      order_type: "pickup",
      payment: { method: "cash" },
      creator_profile: { name: "Mateo Silva" },
      customer_details: {
        name: "Diana Carolina Rojas",
        phone: "3007654321"
      },
      items: [
        { id: "item-8", name: "Granizado Mango Biche con Chamoy", qty: 2, price: 11000, size: "12oz", size_multiplier: 1.2 }
      ]
    }
  ];
}

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

  const fetchOrders = useCallback(async () => {
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
      const fetchedOrders = (data as unknown as OrderWithDetails[]) || [];
      if (fetchedOrders.length === 0) {
        const mocks = getMockOrders(storeId);
        const filteredMocks = selectedStatusFilter === "all"
          ? mocks
          : mocks.filter(m => m.status === selectedStatusFilter);
        setOrders(filteredMocks);
      } else {
        setOrders(fetchedOrders);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cargar ventas: " + msg);
    } finally {
      setLoading(false);
    }
  }, [storeId, selectedStatusFilter, dateRange]);

  useEffect(() => {
    fetchOrders();
  }, [storeId, selectedStatusFilter, dateRange, fetchOrders]);

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
  }, [storeId, fetchOrders]);

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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al actualizar: " + msg);
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al cancelar: " + msg);
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


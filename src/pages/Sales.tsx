import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Eye, Receipt, DollarSign, CalendarDays, Trash2, Edit, Truck, MapPin, Phone, TrendingUp, ShoppingBag, Clock, ArrowUpRight, Package, ChevronRight, Filter, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { OrderRowExpand } from "@/components/sales/OrderRowExpand";
import { Fragment } from "react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { motion, AnimatePresence } from "framer-motion";

type Order = Tables<'orders'>;

type OrderStatus = "pending" | "completed" | "cancelled" | "processing" | "delivered";

interface OrderWithDetails extends Order {
  creator_profile: { name: string | null } | null;
  customer_details: {
    name: string | null;
    document_id?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  order_type?: 'pickup' | 'delivery';
  delivery_fee?: number;
  delivery_address?: string | null;
  delivery_phone?: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  product_id?: string;
  size?: string;
  size_multiplier?: number;
}

const orderStatusOptions: { value: OrderStatus | "all"; label: string; color: string; bgClass: string; textClass: string; glowClass: string }[] = [
  { value: "all", label: "Todos", color: "bg-gray-500", bgClass: "bg-muted", textClass: "text-muted-foreground", glowClass: "" },
  { value: "pending", label: "Pendiente", color: "bg-yellow-500", bgClass: "bg-amber-500/10", textClass: "text-amber-500", glowClass: "shadow-glow-pro" },
  { value: "completed", label: "Completado", color: "bg-green-500", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500", glowClass: "shadow-glow-pro" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-500", bgClass: "bg-red-500/10", textClass: "text-red-500", glowClass: "shadow-glow-pro" },
  { value: "processing", label: "En proceso", color: "bg-blue-500", bgClass: "bg-blue-500/10", textClass: "text-blue-500", glowClass: "shadow-glow-pro" },
  { value: "delivered", label: "Entregado", color: "bg-purple-500", bgClass: "bg-violet-500/10", textClass: "text-violet-500", glowClass: "shadow-glow-pro" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export default function Sales() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<OrderStatus | "all">("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  }));
  const [quickFilter, setQuickFilter] = useState<string>("week");
  const [loading, setLoading] = useState(true);
  const [currentUserStoreId, setCurrentUserStoreId] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Dialog State
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>("pending");
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editOrderType, setEditOrderType] = useState<'pickup' | 'delivery'>("pickup");
  const [editDeliveryFee, setEditDeliveryFee] = useState<number>(0);
  const [editDeliveryAddress, setEditDeliveryAddress] = useState<string>("");
  const [editDeliveryPhone, setEditDeliveryPhone] = useState<string>("");
  const [availableCustomers, setAvailableCustomers] = useState<{ id: string, name: string | null }[]>([]);

  // --- Estado del diálogo de anulación ---
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<OrderWithDetails | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelItems, setCancelItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    fetchCurrentUserStoreId();
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (currentUserStoreId) {
      fetchOrders();
    }
  }, [currentUserStoreId, selectedStatusFilter]);

  const fetchCurrentUserStoreId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setCurrentUserStoreId(profile.store_id);
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name');
      if (error) throw error;
      setAvailableCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          creator_profile:profiles!orders_created_by_fkey(name),
          customer_details:customers!orders_customer_id_fkey(name, document_id, email, phone)
        `)
        .eq('store_id', currentUserStoreId!)
        .order("created_at", { ascending: false });

      if (selectedStatusFilter !== "all") {
        query = query.eq("status", selectedStatusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders((data as unknown as OrderWithDetails[]) || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar ventas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
    setFetchingDetails(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, name, qty, price')
        .eq('order_id', order.id);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error: any) {
      console.error("Error fetching order items:", error);
      toast.error("Error al cargar los detalles de la orden: " + error.message);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleOpenCancelDialog = async (order: OrderWithDetails) => {
    setCancelTargetOrder(order);
    setCancelReason("");
    setIsCancelDialogOpen(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, name, qty, price')
        .eq('order_id', order.id);
      if (!error) setCancelItems(data || []);
    } catch (_) { setCancelItems([]); }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetOrder) return;
    if (!cancelReason.trim()) {
      toast.error("El motivo de anulación es obligatorio.");
      return;
    }
    setIsCancelling(true);
    try {
      const { error } = await (supabase as any).rpc('cancel_sale_with_stock_restore', {
        p_order_id: cancelTargetOrder.id,
        p_reason:   cancelReason.trim()
      });
      if (error) throw error;
      toast.success("✅ Venta anulada. Inventario restaurado correctamente.");
      setIsCancelDialogOpen(false);
      setCancelTargetOrder(null);
      setCancelItems([]);
      fetchOrders();
      queryClient.invalidateQueries({ queryKey: ['products-grid'] });
    } catch (error: any) {
      console.error("Error anulando venta:", error);
      toast.error("Error al anular: " + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAnularOrder = (order: OrderWithDetails) => handleOpenCancelDialog(order);

  const handleOpenEdit = async (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setEditStatus((order.status as OrderStatus) || "pending");
    setEditCustomerId(order.customer_id);
    setEditOrderType(order.order_type || "pickup");
    setEditDeliveryFee(order.delivery_fee || 0);
    setEditDeliveryAddress(order.delivery_address || "");
    setEditDeliveryPhone(order.delivery_phone || "");
    setIsEditOpen(true);
    setFetchingDetails(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, name, qty, price, product_id, size, size_multiplier')
        .eq('order_id', order.id);

      if (error) throw error;
      setEditItems(data || []);
    } catch (error: any) {
      console.error("Error fetching items for edit:", error);
      toast.error("Error al cargar los artículos: " + error.message);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleUpdateItemQty = (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    setEditItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, qty: newQty } : item
    ));
  };

  const handleRemoveItem = (itemId: string) => {
    if (editItems.length <= 1) {
      toast.warning("Un pedido no puede quedarse sin productos. Puedes cancelar la orden en su lugar.");
      return;
    }
    setEditItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateEditTotals = () => {
    const subtotal = editItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const deliveryFee = editOrderType === "delivery" ? editDeliveryFee : 0;
    return {
      subtotal,
      total: subtotal + deliveryFee
    };
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    
    const { subtotal, total } = calculateEditTotals();
    
    const mappedItems = editItems.map(item => ({
      product_id: item.product_id,
      quantity: item.qty,
      price: item.price,
      name: item.name,
      size: item.size || null,
      size_multiplier: item.size_multiplier || 1
    }));

    const updatePayload = {
      order_id: selectedOrder.id,
      customer_id: editCustomerId === 'generic' ? null : editCustomerId,
      status: editStatus,
      tip_amount: 0,
      delivery_fee: editOrderType === "delivery" ? editDeliveryFee : 0,
      order_type: editOrderType,
      delivery_address: editOrderType === "delivery" ? editDeliveryAddress : null,
      delivery_phone: editOrderType === "delivery" ? editDeliveryPhone : null,
      subtotal: subtotal,
      total: total,
      items: mappedItems
    };

    try {
      const { data, error } = await (supabase as any).rpc('update_order_with_stock', {
        order_update_data: updatePayload
      });

      if (error) throw error;
      toast.success("Pedido y existencias actualizados correctamente.");
      setIsEditOpen(false);
      fetchOrders();
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Error al actualizar: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickFilterChange = (value: string) => {
    setQuickFilter(value);
    const now = new Date();
    switch (value) {
      case "today":
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case "week":
        setDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
        break;
      case "month":
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "year":
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
      case "all":
        setDateRange(undefined);
        break;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.creator_profile?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_details?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesDate = true;
    if (dateRange?.from) {
      const orderDate = new Date(order.created_at!);
      if (dateRange.to) {
        matchesDate = isWithinInterval(orderDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) });
      } else {
        matchesDate = isWithinInterval(orderDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.from) });
      }
    }

    return matchesSearch && matchesDate;
  });

  const handleToggleExpand = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handlePrefetchDetails = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['order-items', id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('order_items')
          .select('id, qty, price, subtotal, name, product:products(category)')
          .eq('order_id', id);
        if (error) throw error;
        return data || [];
      },
      staleTime: 5 * 60_000,
    });
  };

  // Computed stats
  const totalSalesFiltered = filteredOrders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.total, 0);

  const completedOrdersCount = filteredOrders.filter(order => order.status === 'completed').length;
  const pendingOrdersCount = filteredOrders.filter(order => order.status === 'pending').length;
  const avgTicket = completedOrdersCount > 0 
    ? Math.round(totalSalesFiltered / completedOrdersCount) 
    : 0;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach(o => {
      counts[o.status as string] = (counts[o.status as string] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const getStatusConfig = (status: string) => {
    return orderStatusOptions.find(opt => opt.value === status) || orderStatusOptions[0];
  };

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen bg-transparent text-foreground p-6 lg:p-10 space-y-10"
      >
        {/* Header Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Historial de Ventas
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Auditoría y Gestión Transaccional • Standard v2.0
            </p>
          </div>

          <div className="flex items-center bg-muted/40 p-1.5 rounded-[1.5rem] border border-border backdrop-blur-xl shadow-pro self-start flex-wrap gap-1">
            {orderStatusOptions.filter(o => o.value === "all" || (statusCounts[o.value] || 0) > 0).map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className={cn(
                  "px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all font-space-grotesk",
                   option.value === selectedStatusFilter
                    ? `${option.bgClass} ${option.textClass} shadow-glow-pro border border-border/50` 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setSelectedStatusFilter(option.value as OrderStatus | "all")}
              >
                {option.label}
                <span className={cn(
                  "ml-3 text-[9px] px-2 py-0.5 rounded-full font-black tabular-nums transition-colors",
                  selectedStatusFilter === option.value ? `${option.bgClass} border border-border/50` : "bg-muted/50"
                )}>
                  {statusCounts[option.value] || 0}
                </span>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* KPI Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "INGRESOS FILTRADOS", icon: DollarSign, val: formatCOP(totalSalesFiltered), sub: "Completados", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "PEDIDOS EXITOSOS", icon: ShoppingBag, val: completedOrdersCount, sub: `De ${filteredOrders.length} totales`, color: "text-indigo-500", bg: "bg-indigo-500/10" },
            { label: "TICKET PROMEDIO", icon: TrendingUp, val: formatCOP(avgTicket), sub: "Venta Media", color: "text-teal-500", bg: "bg-teal-500/10" },
            { label: "ÓRDENES PENDIENTES", icon: Clock, val: pendingOrdersCount, sub: pendingOrdersCount > 0 ? "Requieren Acción" : "Todo al día", color: "text-amber-500", bg: "bg-amber-500/10", glow: pendingOrdersCount > 0 }
          ].map((kpi, i) => (
            <Card key={i} className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">{kpi.label}</span>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-pro transition-transform group-hover:scale-110", kpi.bg, kpi.color)}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl lg:text-4xl font-black font-space-grotesk italic text-foreground tracking-tighter mb-2">
                  {typeof kpi.val === 'string' ? kpi.val.replace("$", "") : kpi.val}
                </div>
                <div className="flex items-center gap-2">
                   {kpi.glow && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-glow-pro" />}
                   <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest italic">{kpi.sub}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Filters Bento */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-5 items-stretch">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="BUSCAR POR ID, CAJERO O CLIENTE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-14 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 transition-all shadow-pro"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={quickFilter} onValueChange={handleQuickFilterChange}>
              <SelectTrigger className="w-[180px] h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk shadow-pro backdrop-blur-xl">
                <SelectValue placeholder="PERIODO" />
              </SelectTrigger>
              <SelectContent className="glass-pro border-border rounded-[1.5rem]">
                <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest italic">Todo el Historial</SelectItem>
                <SelectItem value="today" className="text-[10px] font-black uppercase tracking-widest italic">Hoy</SelectItem>
                <SelectItem value="week" className="text-[10px] font-black uppercase tracking-widest italic">Esta Semana</SelectItem>
                <SelectItem value="month" className="text-[10px] font-black uppercase tracking-widest italic">Este Mes</SelectItem>
                <SelectItem value="year" className="text-[10px] font-black uppercase tracking-widest italic">Este Año</SelectItem>
                <SelectItem value="custom" className="text-[10px] font-black uppercase tracking-widest italic">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "min-w-[240px] h-16 justify-start text-left bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk hover:bg-muted/80 transition-all shadow-pro",
                    !dateRange && "text-muted-foreground/40"
                  )}
                >
                  <CalendarDays className="mr-3 h-4 w-4 text-primary" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <span className="text-foreground">
                        {format(dateRange.from, "dd MMM", { locale: es })} — {format(dateRange.to, "dd MMM", { locale: es })}
                      </span>
                    ) : (
                      <span className="text-foreground">{format(dateRange.from, "dd MMM, y", { locale: es })}</span>
                    )
                  ) : (
                    "RANGO CALENDARIO"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="glass-pro border-white/10 rounded-[2rem] p-4 shadow-pro" align="end">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    if (range) setQuickFilter("custom");
                  }}
                  numberOfMonths={2}
                  className="bg-transparent text-foreground"
                />
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>

        {/* Orders Table Container */}
        <motion.div variants={itemVariants}>
          <Card className="bg-muted border border-border rounded-[3.5rem] p-10 shadow-pro glass-pro overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground mb-1 leading-none">Registro Maestro de Audits</h2>
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Trazabilidad Total de Transacciones</p>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest italic px-4 h-9">
                {filteredOrders.length} OPERACIONES REGISTRADAS
              </Badge>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
                <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Sincronizando Libro Maestro...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 opacity-30">
                <Receipt className="w-20 h-20 mb-6 text-foreground" />
                <h3 className="text-xl font-black italic uppercase tracking-widest text-foreground">SIN OPERACIONES</h3>
                <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] mt-2">No se han detectado transacciones en este bloque.</p>
              </div>
            ) : (
              <div className="table-container-pro max-h-[700px]">
                <table className="w-full text-left">
                  <thead className="sticky-header-pro">
                    <tr className="text-muted-foreground/40 text-[9px] font-black uppercase tracking-[0.3em] font-space-grotesk italic">
                      <th className="py-6 pl-6 whitespace-nowrap">TIMESTAMP</th>
                      <th className="py-6 whitespace-nowrap">ID TRANSACCIÓN</th>
                      <th className="py-6 whitespace-nowrap">OPERADOR</th>
                      <th className="py-6 whitespace-nowrap">DESTINATARIO</th>
                      <th className="py-6 whitespace-nowrap">LIQUIDACIÓN</th>
                      <th className="py-6 whitespace-nowrap">ESTADO FINAL</th>
                      <th className="py-6 text-right pr-6 whitespace-nowrap">CONTROL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {filteredOrders.map((order, idx) => {
                      const statusConfig = getStatusConfig(order.status as string);
                      const isExpanded = expandedRowId === order.id;
                      return (
                        <Fragment key={order.id}>
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={cn(
                              "group transition-all duration-300 cursor-pointer",
                              isExpanded ? "bg-white/5 shadow-pro" : "hover:bg-white/[0.02]"
                            )}
                            onClick={() => handleToggleExpand(order.id)}
                            onMouseEnter={() => handlePrefetchDetails(order.id)}
                          >
                            <td className="py-6 pl-6">
                               <div className="flex items-center gap-4">
                                  <ChevronRight className={cn("w-4 h-4 text-muted-foreground/20 transition-transform", isExpanded && "rotate-90 text-primary")} />
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-foreground italic font-space-grotesk">
                                      {format(new Date(order.created_at!), 'dd MMM', { locale: es })}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/60 font-black">{format(new Date(order.created_at!), 'HH:mm')}</span>
                                  </div>
                               </div>
                            </td>
                            <td className="py-6">
                              <span className="text-[10px] font-black text-muted-foreground/40 group-hover:text-primary transition-colors bg-muted/20 px-3 py-1.5 rounded-xl border border-border font-mono">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                            </td>
                            <td className="py-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-[10px] italic border border-primary/20">
                                  {order.creator_profile?.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <span className="text-[11px] font-black text-foreground group-hover:text-primary transition-colors italic uppercase">{order.creator_profile?.name?.split(' ')[0]}</span>
                              </div>
                            </td>
                            <td className="py-6">
                              <span className="text-[11px] font-black text-muted-foreground italic uppercase">{order.customer_details?.name || 'GENÉRICO'}</span>
                            </td>
                            <td className="py-6">
                              <div className="flex flex-col">
                                <span className={cn(
                                  "text-lg font-black italic font-space-grotesk tabular-nums leading-none",
                                  order.status === 'cancelled' ? "text-muted-foreground/40 line-through" : "text-foreground"
                                )}>
                                  {formatCOP(order.total)}
                                </span>
                                {order.order_type === 'delivery' && (
                                  <span className="text-[8px] text-cyan-500 font-black uppercase tracking-widest mt-1 italic flex items-center gap-1">
                                    <Truck className="w-2.5 h-2.5" /> DOMICILIO
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-6">
                               <div className={cn(
                                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic border shadow-glow-pro transition-all",
                                  statusConfig.bgClass, statusConfig.textClass, "border-white/10"
                               )}>
                                  <div className={cn("w-1.5 h-1.5 rounded-full", statusConfig.color, order.status === 'pending' && "animate-pulse")} />
                                  {statusConfig.label}
                               </div>
                            </td>
                            <td className="py-6 text-right pr-6">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                <Button
                                  variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                                  onClick={(e) => { e.stopPropagation(); handleViewDetails(order); }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-indigo-500/20 hover:text-indigo-400 transition-all shadow-pro"
                                  onClick={(e) => { e.stopPropagation(); handleOpenEdit(order); }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="w-9 h-9 rounded-full bg-white/5 border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-all shadow-pro"
                                  onClick={(e) => { e.stopPropagation(); handleOpenCancelDialog(order); }}
                                  disabled={order.status === 'cancelled'}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 border-none">
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  className="bg-muted/30"
                                >
                                  <OrderRowExpand 
                                    order={order} 
                                    isOpen={isExpanded}
                                    onVerFactura={handleViewDetails}
                                    onAnular={handleAnularOrder}
                                  />
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Dialogs: Detailed Audit View */}
        <AnimatePresence>
          {isDetailsOpen && (
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border rounded-[3rem] text-foreground shadow-pro animate-in zoom-in-95 duration-300">
                <DialogHeader className="mb-6">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                        <Receipt className="w-6 h-6 text-primary" />
                     </div>
                     <div>
                        <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Audit Auditivo</DialogTitle>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Registro Maestro #{selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogDescription>
                     </div>
                  </div>
                </DialogHeader>

                {selectedOrder && (
                  <div className="space-y-6">
                    <div className="p-6 glass-pro rounded-[2rem] border border-border bg-primary/5 shadow-pro relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Package className="w-16 h-16 text-primary" />
                       </div>
                       <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/60 italic mb-2 font-space-grotesk">DESTINATARIO FINAL</p>
                       <p className="text-xl lg:text-3xl font-black italic font-space-grotesk text-foreground mb-2 truncate pr-2">{selectedOrder.customer_details?.name || 'CONSUMIDOR GENERAL'}</p>
                       {selectedOrder.customer_details && (
                         <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 italic">
                             {selectedOrder.customer_details.document_id && <span>DNI: {selectedOrder.customer_details.document_id}</span>}
                             {selectedOrder.customer_details.phone && <span>TEL: {selectedOrder.customer_details.phone}</span>}
                         </div>
                       )}
                    </div>

                    <div className="space-y-4">
                       <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 italic px-2 font-space-grotesk border-b border-border/50 pb-2">DESGLOSE DE MERCANCÍA</p>
                       {fetchingDetails ? (
                         <div className="py-12 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                       ) : (
                         <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                            {orderItems.map((item) => (
                              <div key={item.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                 <div className="flex flex-col">
                                    <span className={cn("text-xs font-black italic uppercase font-space-grotesk", item.name.startsWith('Topping:') ? "text-muted-foreground" : "text-foreground")}>
                                      {item.name.replace('Topping:', '+ ')}
                                    </span>
                                    {!item.name.startsWith('Topping:') && (
                                       <span className="text-[9px] font-black text-muted-foreground/40">QUANTITY: {item.qty} × {formatCOP(item.price)}</span>
                                    )}
                                 </div>
                                 <span className="text-sm font-black italic font-space-grotesk tabular-nums">{formatCOP(item.price * item.qty)}</span>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>

                    <div className="p-6 glass-pro rounded-[2.5rem] border border-border space-y-3">
                       <div className="flex justify-between text-[11px] font-black uppercase italic text-muted-foreground font-space-grotesk">
                          <span>BASE IMPONIBLE</span>
                          <span className="text-foreground">{formatCOP(selectedOrder.subtotal)}</span>
                       </div>
                       {selectedOrder.order_type === 'delivery' && (
                         <div className="flex justify-between text-[11px] font-black uppercase italic text-cyan-500 font-space-grotesk">
                           <span>LOGÍSTICA ENTREGA</span>
                           <span>{formatCOP(selectedOrder.delivery_fee || 0)}</span>
                         </div>
                       )}
                       <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-2">
                          <span className="text-xs font-black uppercase tracking-widest text-primary italic">LIQUIDACIÓN TOTAL</span>
                          <span className="text-2xl lg:text-3xl font-black italic font-space-grotesk text-emerald-500 shadow-glow-pro-text">{formatCOP(selectedOrder.total)}</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between p-5 glass-pro rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border italic font-black text-[9px]">
                              {selectedOrder.creator_profile?.name?.charAt(0)}
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">CAJERO: {selectedOrder.creator_profile?.name?.toUpperCase()}</span>
                        </div>
                        <Badge className="bg-muted text-muted-foreground border-border text-[9px] font-black uppercase italic px-3">
                           {selectedOrder.payment ? String(Object.values(selectedOrder.payment)[0]).toUpperCase() : 'EFECTIVO'}
                        </Badge>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Edit Process Logic Remains consistent but with v2.0 Aesthetics */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
           <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border/50 rounded-[3rem] text-foreground shadow-pro">
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                    <Edit className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Recalibrar Registro</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Modificación Auditada de Transacción</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic px-2">Estado Auditado</Label>
                       <Select value={editStatus} onValueChange={(value: OrderStatus) => setEditStatus(value)}>
                          <SelectTrigger className="h-14 bg-muted border-border rounded-2xl text-[10px] font-black italic uppercase font-space-grotesk">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-pro border-border rounded-2xl">
                             {orderStatusOptions.filter(o => o.value !== "all").map(opt => (
                               <SelectItem key={opt.value} value={opt.value} className="text-[10px] font-black uppercase italic">{opt.label}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground italic px-2">Identidad Cliente</Label>
                       <Select value={editCustomerId || "generic"} onValueChange={setEditCustomerId}>
                          <SelectTrigger className="h-14 bg-muted border-border rounded-2xl text-[10px] font-black italic uppercase font-space-grotesk">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass-pro border-border rounded-2xl">
                             <SelectItem value="generic" className="text-[10px] font-black uppercase italic">Anónimo / Consumidor Final</SelectItem>
                             {availableCustomers.map(c => <SelectItem key={c.id} value={c.id} className="text-[10px] font-black uppercase italic">{c.name}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <Tabs value={editOrderType} onValueChange={(v) => setEditOrderType(v as any)} className="w-full">
                       <TabsList className="grid grid-cols-2 h-14 bg-muted rounded-2xl p-1 border border-border">
                          <TabsTrigger value="pickup" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-[10px] font-black uppercase italic rounded-xl">ATENCION EN LOCAL</TabsTrigger>
                          <TabsTrigger value="delivery" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400 text-[10px] font-black uppercase italic rounded-xl">LOGÍSTICA DOMICILIO</TabsTrigger>
                       </TabsList>
                    </Tabs>
                    
                    {editOrderType === 'delivery' && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 glass-pro bg-cyan-500/5 rounded-[2rem] border border-cyan-500/20 space-y-4">
                          <div>
                             <Label className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest italic mb-2">VECTOR DIRECCIONAL (ENTREGA)</Label>
                             <Input 
                                value={editDeliveryAddress} 
                                onChange={(e) => setEditDeliveryAddress(e.target.value)}
                                className="h-12 bg-muted border-border rounded-xl text-[11px] font-black uppercase italic font-space-grotesk" 
                                placeholder="INGRESE DIRECCIÓN..."
                             />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <Label className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest italic mb-2">TELECOM</Label>
                                <Input value={editDeliveryPhone} onChange={(e) => setEditDeliveryPhone(e.target.value)} className="h-12 bg-muted border-border rounded-xl text-[11px] font-black font-space-grotesk" placeholder="CONTACTO..." />
                             </div>
                             <div>
                                <Label className="text-[8px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest italic mb-2">COSTO LOGÍSTIVO</Label>
                                <Input type="number" value={editDeliveryFee} onChange={(e) => setEditDeliveryFee(Number(e.target.value))} className="h-12 bg-muted border-border rounded-xl text-[11px] font-black font-space-grotesk italic" />
                             </div>
                          </div>
                       </motion.div>
                    )}
                 </div>

                 <div className="space-y-4">
                   <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2 font-space-grotesk border-b border-border pb-2">RECALIBRACIÓN DE ARTÍCULOS</Label>
                   <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                      {editItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border group hover:border-primary/30 transition-all">
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-black italic uppercase font-space-grotesk text-foreground truncate">{item.name}</p>
                              <p className="text-[9px] font-black text-muted-foreground italic">{formatCOP(item.price)} C/U</p>
                           </div>
                           <div className="flex items-center gap-3 ml-4 bg-muted p-1 rounded-xl border border-border">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => handleUpdateItemQty(item.id, item.qty - 1)} disabled={item.qty <= 1}>-</Button>
                              <span className="text-[11px] font-black italic tabular-nums w-4 text-center">{item.qty}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" onClick={() => handleUpdateItemQty(item.id, item.qty + 1)}>+</Button>
                           </div>
                           <div className="w-[80px] text-right font-black italic font-space-grotesk text-sm tabular-nums ml-4">{formatCOP(item.price * item.qty)}</div>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/40 hover:text-red-500 ml-2" onClick={() => handleRemoveItem(item.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                   </div>
                 </div>

                 <div className="p-8 glass-pro rounded-[2.5rem] border border-border flex items-center justify-between bg-emerald-500/5 mt-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600 dark:text-emerald-500/60 italic font-space-grotesk">NUEVA LIQUIDACIÓN TOTAL</span>
                    <span className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-emerald-600 dark:text-emerald-500 shadow-glow-pro-text tabular-nums">{formatCOP(calculateEditTotals().total)}</span>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted">ABORTAR CAMBIOS</Button>
                    <Button onClick={handleUpdateOrder} disabled={isUpdating} className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all">
                       {isUpdating ? "SINCRONIZANDO..." : "COMPROMETER CAMBIOS ✓"}
                    </Button>
                 </div>
              </div>
           </DialogContent>
        </Dialog>

        {/* Cancel Dialog: v2.0 Appetite Standard */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
           <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-red-500/20 rounded-[3rem] text-foreground shadow-pro">
              <DialogHeader className="mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                       <Trash2 className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                       <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Anular Transacción</DialogTitle>
                       <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-500/60 italic">Operación Destructiva Auditada</DialogDescription>
                    </div>
                 </div>
              </DialogHeader>

              {cancelTargetOrder && (
                 <div className="space-y-6">
                    <div className="p-6 glass-pro bg-red-500/5 rounded-[2rem] border border-red-500/10 space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                               <p className="text-[9px] font-black uppercase text-muted-foreground italic tracking-widest">ID TRANSACCIÓN</p>
                               <p className="text-xl font-black italic font-space-grotesk underline decoration-red-500/30">#{cancelTargetOrder.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[9px] font-black uppercase text-red-600 dark:text-red-500/60 italic tracking-widest">VALOR A REVERTIR</p>
                               <p className="text-2xl lg:text-3xl font-black italic font-space-grotesk text-red-600 dark:text-red-500 tabular-nums">{formatCOP(cancelTargetOrder.total)}</p>
                            </div>
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground text-center leading-relaxed">
                          La anulación restaurará el <span className="text-emerald-600 dark:text-emerald-500 font-bold uppercase italic tracking-tighter">STOCK INMEDIATAMENTE</span>. 
                          Esta acción no se puede revertir.
                        </p>
                    </div>

                    <div className="space-y-4">
                       <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">JUSTIFICACIÓN OBLIGATORIA</Label>
                       <textarea
                         className="w-full bg-muted border border-border rounded-[1.5rem] p-5 text-[11px] font-black italic uppercase font-space-grotesk text-foreground placeholder:text-muted-foreground/30 focus:border-red-500 focus:ring-red-500/20 transition-all resize-none h-32"
                         placeholder="EJ: ERROR EN LIQUIDACIÓN, DEVOLUCIÓN POR CALIDAD..."
                         value={cancelReason}
                         onChange={(e) => setCancelReason(e.target.value)}
                       />
                    </div>

                    <div className="flex gap-4 pt-2">
                       <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} className="flex-1 h-16 rounded-[1.5rem] text-[10px] font-black uppercase italic tracking-widest text-muted-foreground hover:text-foreground">ABORTAR</Button>
                       <Button 
                          onClick={handleConfirmCancel} 
                          disabled={isCancelling || !cancelReason.trim()}
                          className="flex-1 h-16 rounded-[1.5rem] bg-rose-600 text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:bg-rose-500 transition-all"
                       >
                          {isCancelling ? "REVIRTIENDO..." : "ANULAR OPERACIÓN ✓"}
                       </Button>
                    </div>
                 </div>
              )}
           </DialogContent>
        </Dialog>
      </motion.div>
    </Layout>
  );
}

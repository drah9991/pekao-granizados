import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Eye, Receipt, DollarSign, CalendarDays, Trash2, Edit, Truck, MapPin, Phone, TrendingUp, ShoppingBag, Clock, ArrowUpRight, Package } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
}

const orderStatusOptions: { value: OrderStatus | "all"; label: string; color: string; bgClass: string; textClass: string; glowClass: string }[] = [
  { value: "all", label: "Todos", color: "bg-gray-500", bgClass: "bg-slate-500/10", textClass: "text-slate-400", glowClass: "" },
  { value: "pending", label: "Pendiente", color: "bg-yellow-500", bgClass: "bg-amber-500/10", textClass: "text-amber-500", glowClass: "shadow-[0_0_15px_rgba(245,158,11,0.15)]" },
  { value: "completed", label: "Completado", color: "bg-green-500", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500", glowClass: "shadow-[0_0_15px_rgba(16,185,129,0.15)]" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-500", bgClass: "bg-red-500/10", textClass: "text-red-500", glowClass: "shadow-[0_0_15px_rgba(239,68,68,0.15)]" },
  { value: "processing", label: "En proceso", color: "bg-blue-500", bgClass: "bg-blue-500/10", textClass: "text-blue-500", glowClass: "shadow-[0_0_15px_rgba(59,130,246,0.15)]" },
  { value: "delivered", label: "Entregado", color: "bg-purple-500", bgClass: "bg-violet-500/10", textClass: "text-violet-500", glowClass: "shadow-[0_0_15px_rgba(139,92,246,0.15)]" },
];

export default function Sales() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<OrderStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [currentUserStoreId, setCurrentUserStoreId] = useState<string | null>(null);

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
      if (!user) {
        toast.error("Usuario no autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setCurrentUserStoreId(profile.store_id);
      } else {
        toast.warning("No se encontró un ID de tienda para el usuario. No podrás ver las ventas.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
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

  const handleDeleteOrder = async (order: OrderWithDetails) => {
    if (!confirm(`¿Estás seguro de eliminar el pedido #${order.id.slice(0, 8)}? Esta acción no se puede deshacer.`)) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;
      toast.success("Pedido eliminado correctamente.");
      fetchOrders();
    } catch (error: any) {
      console.error("Error deleting order:", error);
      toast.error("Error al eliminar el pedido: " + error.message);
    }
  };

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
        .select('id, name, qty, price, product_id')
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
      product_id: (item as any).product_id,
      quantity: item.qty,
      price: item.price,
      name: item.name,
      size_multiplier: 1
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.creator_profile?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_details?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Computed stats
  const totalSalesToday = orders
    .filter(order => new Date(order.created_at!).toDateString() === new Date().toDateString() && order.status === 'completed')
    .reduce((sum, order) => sum + order.total, 0);

  const completedOrdersCount = orders.filter(order => order.status === 'completed').length;
  
  const pendingOrdersCount = orders.filter(order => order.status === 'pending').length;

  const avgTicket = completedOrdersCount > 0 
    ? orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0) / completedOrdersCount 
    : 0;

  // Status counts for tabs
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
      <div className="min-h-screen bg-[#0F1117] text-white p-6 lg:p-10 space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight mb-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Historial de Ventas
            </h1>
            <p className="text-slate-400 font-medium">
              Gestión completa de transacciones • {format(new Date(), "eeee d MMM yyyy", { locale: es }).replace(/^\w/, (c) => c.toUpperCase())}
            </p>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800/50 backdrop-blur-xl shadow-inner self-start flex-wrap gap-1">
            {orderStatusOptions.filter(o => o.value === "all" || (statusCounts[o.value] || 0) > 0).map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                className={cn(
                  "px-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  selectedStatusFilter === option.value 
                    ? `${option.bgClass} ${option.textClass} shadow-lg` 
                    : "text-slate-500 hover:text-white"
                )}
                onClick={() => setSelectedStatusFilter(option.value as OrderStatus | "all")}
              >
                {option.label}
                {statusCounts[option.value] !== undefined && (
                  <span className={cn(
                    "ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-black",
                    selectedStatusFilter === option.value ? `${option.bgClass}` : "bg-slate-800"
                  )}>
                    {statusCounts[option.value]}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Revenue Today */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ingresos Hoy</span>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{formatCurrency(totalSalesToday)}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500">
                  <ArrowUpRight className="w-3 h-3" />
                  En vivo
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
            </CardContent>
          </Card>

          {/* Completed Orders */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Completados</span>
              <div className="w-10 h-10 bg-indigo-500/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <ShoppingBag className="w-5 h-5 text-indigo-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{completedOrdersCount}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">de {orders.length} pedidos totales</span>
              </div>
            </CardContent>
          </Card>

          {/* Avg Ticket */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-teal-500/0 via-teal-500/40 to-teal-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ticket Promedio</span>
              <div className="w-10 h-10 bg-teal-500/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <TrendingUp className="w-5 h-5 text-teal-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{formatCurrency(avgTicket)}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">por venta completada</span>
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="bg-[#1C1F26] border-none rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pendientes</span>
              <div className="w-10 h-10 bg-amber-500/10 rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black mb-2 tracking-tighter">{pendingOrdersCount}</div>
              <div className="flex items-center gap-2">
                {pendingOrdersCount > 0 && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <span className="text-[10px] font-bold text-amber-500 uppercase">Requieren atención</span>
                  </>
                )}
                {pendingOrdersCount === 0 && (
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Todo al día ✓</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por ID, cajero o cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 bg-[#1C1F26] border-slate-800/50 rounded-2xl text-white placeholder:text-slate-600 focus:border-primary/50 focus:ring-primary/20 transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Orders Table */}
        <Card className="bg-[#1C1F26] border-none rounded-[3.5rem] p-8 lg:p-10 shadow-2xl border-t border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <CardTitle className="text-2xl font-black tracking-tight mb-1">Registro de Pedidos</CardTitle>
              <CardDescription className="text-slate-400 font-medium tracking-wide">
                {filteredOrders.length} transacciones encontradas
              </CardDescription>
            </div>
            <div className="p-1 px-4 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              {selectedStatusFilter === 'all' ? 'Todos' : getStatusConfig(selectedStatusFilter).label}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
              <p className="text-slate-400 font-bold animate-pulse">Sincronizando pedidos...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <Receipt className="w-20 h-20 mb-6" />
              <h3 className="text-xl font-black mb-2">Sin pedidos</h3>
              <p className="text-slate-400 font-medium text-sm">
                {searchQuery || selectedStatusFilter !== "all"
                  ? "No se encontraron pedidos con los filtros aplicados"
                  : "Aún no se han realizado ventas en esta tienda."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-8 lg:-mx-10 px-8 lg:px-10">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="pb-6 pl-2">ID Pedido</th>
                    <th className="pb-6">Fecha / Hora</th>
                    <th className="pb-6">Cajero</th>
                    <th className="pb-6">Cliente</th>
                    <th className="pb-6">Total</th>
                    <th className="pb-6">Estado</th>
                    <th className="pb-6 text-right pr-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status as string);
                    return (
                      <tr key={order.id} className="group hover:bg-white/[0.02] transition-colors duration-200">
                        <td className="py-5 pl-2">
                          <span className="text-xs font-black text-slate-400 group-hover:text-white transition-colors">
                            #{order.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-300">
                              {format(new Date(order.created_at!), 'dd MMM yyyy', { locale: es })}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {format(new Date(order.created_at!), 'hh:mm a')}
                            </span>
                          </div>
                        </td>
                        <td className="py-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-black text-[10px] shadow-inner">
                              {order.creator_profile?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="text-xs font-bold text-slate-300">{order.creator_profile?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-5">
                          <span className="text-xs font-bold text-slate-300">{order.customer_details?.name || 'Cliente General'}</span>
                        </td>
                        <td className="py-5">
                          <div className="flex flex-col">
                            <span className={cn(
                              "font-black text-lg tabular-nums",
                              order.status === 'cancelled' ? "text-slate-600 line-through" : "text-white"
                            )}>
                              {formatCurrency(order.total)}
                            </span>
                            {order.order_type === 'delivery' && (
                              <span className="flex items-center gap-1 text-[10px] text-cyan-500 font-black uppercase tracking-tight">
                                <Truck className="w-3 h-3" /> Domicilio
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-5">
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight",
                            statusConfig.bgClass,
                            statusConfig.textClass,
                            statusConfig.glowClass
                          )}>
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              statusConfig.color,
                              order.status === 'pending' && "animate-pulse"
                            )} />
                            {statusConfig.label}
                          </div>
                        </td>
                        <td className="py-5 text-right pr-2">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                              onClick={() => handleViewDetails(order)}
                              title="Ver detalles"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-500 transition-all"
                              onClick={() => handleOpenEdit(order)}
                              title="Editar pedido"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all"
                              onClick={() => handleDeleteOrder(order)}
                              title="Eliminar pedido"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-md bg-[#1C1F26] border-slate-800/50 rounded-[2.5rem] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Detalle de Venta</DialogTitle>
              <DialogDescription className="sr-only">Desglose exacto de la venta, cliente y métodos de pago.</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-3">
                  <span className="font-black text-slate-400">Pedido: <span className="text-white">#{selectedOrder.id.slice(0, 8)}</span></span>
                  <span className="text-[11px] font-bold text-slate-500">{new Date(selectedOrder.created_at!).toLocaleString('es-CO')}</span>
                </div>

                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 text-sm">
                  <p className="font-black text-primary text-[10px] uppercase tracking-[0.15em] mb-1.5">Cliente</p>
                  <p className="font-black text-lg">{selectedOrder.customer_details?.name || 'Consumidor Final'}</p>
                  {selectedOrder.customer_details && selectedOrder.customer_details.name && (
                    <div className="flex gap-4 mt-2 text-[11px] text-slate-400 font-medium">
                      {selectedOrder.customer_details.document_id && <span>CC: {selectedOrder.customer_details.document_id}</span>}
                      {selectedOrder.customer_details.phone && <span>Tel: {selectedOrder.customer_details.phone}</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Artículos</p>
                  {fetchingDetails ? (
                    <div className="py-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
                  ) : orderItems.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-4">No se encontraron artículos.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-start py-2.5 border-b border-white/[0.03] last:border-0">
                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <span className="font-bold text-sm leading-tight">
                              {item.name.startsWith('Topping:') ? (
                                <span className="text-slate-400 font-normal ml-3">+ {item.name.replace('Topping:', '').trim()}</span>
                              ) : (
                                <span>{item.name}</span>
                              )}
                            </span>
                            {!item.name.startsWith('Topping:') && (
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-800 font-black text-primary text-[10px]">
                                  {item.qty}
                                </span>
                                <span>×</span>
                                <span>{formatCurrency(item.price)} <span className="opacity-50 italic">c/u</span></span>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 ml-4">
                            <span className="font-black text-sm">{formatCurrency(item.price * item.qty)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 font-medium">Subtotal Base</span>
                    <span className="font-bold">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.order_type === 'delivery' && (
                    <div className="flex justify-between text-sm text-cyan-500 font-bold">
                      <span>Servicio de Domicilio</span>
                      <span>{formatCurrency(selectedOrder.delivery_fee || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-xl pt-2">
                    <span>Total Pagado</span>
                    <span className="text-emerald-500">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                {selectedOrder.order_type === 'delivery' && (
                  <div className="bg-cyan-500/5 p-4 rounded-2xl border border-cyan-500/10 text-sm space-y-2">
                    <div className="flex items-center gap-2 text-cyan-500 font-black text-[10px] uppercase tracking-[0.2em]">
                      <MapPin className="w-3.5 h-3.5" /> Dirección de Entrega
                    </div>
                    <p className="text-white font-medium">{selectedOrder.delivery_address || 'Sin dirección registrada'}</p>
                    {selectedOrder.delivery_phone && (
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                        <Phone className="w-3 h-3" /> {selectedOrder.delivery_phone}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold pt-4 border-t border-white/5">
                  <span>Atendido por: {selectedOrder.creator_profile?.name || 'N/A'}</span>
                  <span className="bg-slate-800 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                    {selectedOrder.payment ? Object.values(selectedOrder.payment)[0] as string : 'Efectivo'}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Order Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md lg:max-w-lg bg-[#1C1F26] border-slate-800/50 rounded-[2.5rem] text-white shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Editar Pedido</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">Modifica el estado, cliente o productos del pedido.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Estado</label>
                  <Select
                    value={editStatus}
                    onValueChange={(value: OrderStatus) => setEditStatus(value)}
                  >
                    <SelectTrigger className="w-full h-10 bg-slate-900/50 border-slate-800/50 rounded-xl text-white">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatusOptions.filter(o => o.value !== "all").map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Cliente</label>
                  <Select
                    value={editCustomerId || "generic"}
                    onValueChange={(value: string) => setEditCustomerId(value)}
                  >
                    <SelectTrigger className="w-full h-10 bg-slate-900/50 border-slate-800/50 rounded-xl text-white">
                      <SelectValue placeholder="Consumidor Final" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="generic">Consumidor Final</SelectItem>
                      {availableCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Tipo de Pedido</label>
                <Tabs 
                  value={editOrderType} 
                  onValueChange={(val) => setEditOrderType(val as 'pickup' | 'delivery')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-900/50 rounded-xl">
                    <TabsTrigger value="pickup" className="text-xs font-black rounded-lg">Local</TabsTrigger>
                    <TabsTrigger value="delivery" className="text-xs font-black rounded-lg">Domicilio</TabsTrigger>
                  </TabsList>
                </Tabs>

                {editOrderType === "delivery" && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 animate-in fade-in zoom-in-95 duration-200">
                    <div className="col-span-2">
                      <label className="text-[10px] font-black uppercase text-cyan-500 tracking-[0.15em]">Dirección de Entrega</label>
                      <Input 
                        value={editDeliveryAddress}
                        onChange={(e) => setEditDeliveryAddress(e.target.value)}
                        className="h-9 text-sm bg-slate-900/50 border-slate-800/50 rounded-xl text-white mt-1"
                        placeholder="Calle... # ..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-cyan-500 tracking-[0.15em]">Teléfono</label>
                      <Input 
                        value={editDeliveryPhone}
                        onChange={(e) => setEditDeliveryPhone(e.target.value)}
                        className="h-9 text-sm bg-slate-900/50 border-slate-800/50 rounded-xl text-white mt-1"
                        placeholder="300..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-cyan-500 tracking-[0.15em]">Costo Domicilio</label>
                      <Input 
                        type="number"
                        value={editDeliveryFee}
                        onChange={(e) => setEditDeliveryFee(Number(e.target.value))}
                        className="h-9 text-sm bg-slate-900/50 border-slate-800/50 rounded-xl text-white mt-1"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Editar Artículos</p>
                {fetchingDetails ? (
                  <div className="py-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                    {editItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-3 border-b border-white/[0.03] last:border-0 gap-3 group/item hover:bg-white/[0.02] rounded-xl px-2 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{formatCurrency(item.price)} c/u</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg bg-slate-900/50 border-slate-800/50 text-white hover:bg-slate-800"
                            onClick={() => handleUpdateItemQty(item.id, item.qty - 1)}
                            disabled={item.qty <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-black">{item.qty}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg bg-slate-900/50 border-slate-800/50 text-white hover:bg-slate-800"
                            onClick={() => handleUpdateItemQty(item.id, item.qty + 1)}
                          >
                            +
                          </Button>
                        </div>

                        <div className="text-right min-w-[80px]">
                          <p className="font-black">{formatCurrency(item.price * item.qty)}</p>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-lg text-red-500 hover:bg-red-500/10"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-900/30 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center font-black text-xl">
                  <span className="text-slate-300">Nuevo Total:</span>
                  <span className="text-emerald-500">{formatCurrency(calculateEditTotals().total)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 font-bold"
                >
                  Cancelar
                </Button>
                <Button 
                  className="gradient-primary rounded-xl font-black shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.4)] transition-all px-8" 
                  onClick={handleUpdateOrder} 
                  disabled={isUpdating || fetchingDetails}
                >
                  {isUpdating ? "Guardando..." : "Finalizar Edición"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

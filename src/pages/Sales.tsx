import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Filter, Eye, Receipt, DollarSign, CalendarDays, Trash2, Edit, Truck, MapPin, Phone } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/formatters";

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

const orderStatusOptions: { value: OrderStatus | "all"; label: string; color: string }[] = [
  { value: "all", label: "Todos los estados", color: "bg-gray-500" },
  { value: "pending", label: "Pendiente", color: "bg-yellow-500" },
  { value: "completed", label: "Completado", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelado", color: "bg-red-500" },
  { value: "processing", label: "En proceso", color: "bg-blue-500" },
  { value: "delivered", label: "Entregado", color: "bg-purple-500" },
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
  const [editTipAmount, setEditTipAmount] = useState<number>(0);
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
    setEditTipAmount(order.tip_amount || 0);
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
      total: subtotal + editTipAmount + deliveryFee
    };
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    
    const { subtotal, total } = calculateEditTotals();
    
    // Preparar items para el RPC (mapeando campos si es necesario)
    const mappedItems = editItems.map(item => ({
      product_id: (item as any).product_id,
      quantity: item.qty,
      price: item.price,
      name: item.name,
      size_multiplier: 1 // Por defecto 1 si no se guardó originalmente.
    }));

    const updatePayload = {
      order_id: selectedOrder.id,
      customer_id: editCustomerId === 'generic' ? null : editCustomerId,
      status: editStatus,
      tip_amount: editTipAmount,
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

  const totalSalesToday = orders
    .filter(order => new Date(order.created_at!).toDateString() === new Date().toDateString() && order.status === 'completed')
    .reduce((sum, order) => sum + order.total, 0);

  const completedOrdersCount = orders.filter(order => order.status === 'completed').length;

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              Historial de Ventas
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Revisa y gestiona todas las transacciones de tu tienda
            </p>
          </div>
        </div>

        {/* Sales Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="glass-card shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Ventas Hoy</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalSalesToday)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </CardContent>
          </Card>
          <Card className="glass-card shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pedidos Completados</p>
                <p className="text-2xl font-bold text-accent">{completedOrdersCount}</p>
              </div>
              <Receipt className="w-8 h-8 text-accent" />
            </CardContent>
          </Card>
          <Card className="glass-card shadow-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Pedidos</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
              <CalendarDays className="w-8 h-8 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="glass-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID de pedido, cajero o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={selectedStatusFilter}
                onValueChange={(value: OrderStatus | "all") => setSelectedStatusFilter(value)}
              >
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  {orderStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Pedidos Recientes</CardTitle>
            <CardDescription>
              {filteredOrders.length} pedidos encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando pedidos...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay pedidos</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedStatusFilter !== "all"
                    ? "No se encontraron pedidos con los filtros aplicados"
                    : "Aún no se han realizado ventas en esta tienda."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Pedido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cajero</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const statusConfig = orderStatusOptions.find(opt => opt.value === order.status);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id.slice(0, 8)}</TableCell>
                          <TableCell>{new Date(order.created_at!).toLocaleString('es-CO')}</TableCell>
                          <TableCell>{order.creator_profile?.name || 'N/A'}</TableCell>
                          <TableCell>{order.customer_details?.name || 'Cliente General'}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold">{formatCurrency(order.total)}</span>
                              {order.order_type === 'delivery' && (
                                <span className="flex items-center gap-1 text-[10px] text-blue-500 font-bold uppercase">
                                  <Truck className="w-3 h-3" /> Domicilio
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusConfig?.color || "bg-gray-500"}`}>
                              {statusConfig?.label || order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                                onClick={() => handleViewDetails(order)}
                                title="Ver detalles"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-accent hover:bg-accent/10"
                                onClick={() => handleOpenEdit(order)}
                                title="Editar estado"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteOrder(order)}
                                title="Eliminar pedido"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Detalle de Venta</DialogTitle>
              <DialogDescription className="sr-only">Desglose exacto de la venta, cliente y métodos de pago.</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4 py-4">
                <div className="flex justify-between items-center text-sm border-b pb-2">
                  <span className="font-semibold text-muted-foreground">Pedido: <span className="text-foreground">#{selectedOrder.id.slice(0, 8)}</span></span>
                  <span className="text-muted-foreground">{new Date(selectedOrder.created_at!).toLocaleString('es-CO')}</span>
                </div>

                <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-sm">
                  <p className="font-semibold text-primary mb-1">Cliente:</p>
                  <p className="font-medium text-base">{selectedOrder.customer_details?.name || 'Consumidor Final'}</p>
                  {selectedOrder.customer_details && selectedOrder.customer_details.name && (
                    <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-muted-foreground w-full">
                      {selectedOrder.customer_details.document_id && <span>CC: {selectedOrder.customer_details.document_id}</span>}
                      {selectedOrder.customer_details.phone && <span>Tel: {selectedOrder.customer_details.phone}</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="font-semibold text-sm text-foreground border-b pb-1">Artículos Facturados:</p>
                  {fetchingDetails ? (
                    <div className="py-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
                  ) : orderItems.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No se encontraron artículos para esta orden.</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm py-1 border-b border-border/30 last:border-0 relative">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {item.name.startsWith('Topping:') ? (
                                <span className="text-muted-foreground font-normal ml-4">+ {item.name.replace('Topping:', '').trim()}</span>
                              ) : (
                                <span>{item.qty}x {item.name}</span>
                              )}
                            </span>
                          </div>
                          <span className="font-bold shrink-0 ml-4">{formatCurrency(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal Base</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.tip_amount !== null && selectedOrder.tip_amount !== undefined && (
                    <div className="flex justify-between text-sm text-pink-500 font-medium">
                      <span>Propina Voluntaria</span>
                      <span>{formatCurrency(selectedOrder.tip_amount)}</span>
                    </div>
                  )}
                  {selectedOrder.order_type === 'delivery' && (
                    <div className="flex justify-between text-sm text-blue-500 font-medium">
                      <span>Servicio de Domicilio</span>
                      <span>{formatCurrency(selectedOrder.delivery_fee || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-1">
                    <span>Total Pagado</span>
                    <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                {selectedOrder.order_type === 'delivery' && (
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 font-bold">
                      <MapPin className="w-4 h-4" /> Dirección de Entrega
                    </div>
                    <p className="text-foreground">{selectedOrder.delivery_address || 'Sin dirección registrada'}</p>
                    {selectedOrder.delivery_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Phone className="w-3 h-3" /> {selectedOrder.delivery_phone}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
                  <span>Atendido por: {selectedOrder.creator_profile?.name || 'N/A'}</span>
                  <span>Pago: {selectedOrder.payment ? Object.values(selectedOrder.payment)[0] as string : 'Efectivo'}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Order Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md lg:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Pedido</DialogTitle>
              <DialogDescription>Modifica el estado, cliente o productos del pedido.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Estado</label>
                  <Select
                    value={editStatus}
                    onValueChange={(value: OrderStatus) => setEditStatus(value)}
                  >
                    <SelectTrigger className="w-full h-9">
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Cliente</label>
                  <Select
                    value={editCustomerId || "generic"}
                    onValueChange={(value: string) => setEditCustomerId(value)}
                  >
                    <SelectTrigger className="w-full h-9">
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
                <label className="text-xs font-semibold text-foreground">Tipo de Pedido</label>
                <Tabs 
                  value={editOrderType} 
                  onValueChange={(val) => setEditOrderType(val as 'pickup' | 'delivery')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="pickup" className="text-xs">Local</TabsTrigger>
                    <TabsTrigger value="delivery" className="text-xs">Domicilio</TabsTrigger>
                  </TabsList>
                </Tabs>

                {editOrderType === "delivery" && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/30 rounded-lg border border-blue-100 animate-in fade-in zoom-in-95 duration-200">
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold uppercase text-blue-600">Dirección de Entrega</label>
                      <Input 
                        value={editDeliveryAddress}
                        onChange={(e) => setEditDeliveryAddress(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Calle... # ..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-blue-600">Teléfono</label>
                      <Input 
                        value={editDeliveryPhone}
                        onChange={(e) => setEditDeliveryPhone(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="300..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-blue-600">Costo Domicilio</label>
                      <Input 
                        type="number"
                        value={editDeliveryFee}
                        onChange={(e) => setEditDeliveryFee(Number(e.target.value))}
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <p className="font-semibold text-sm text-foreground border-b pb-1">Editar Artículos:</p>
                {fetchingDetails ? (
                  <div className="py-8 text-center"><div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></div>
                ) : (
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-hide">
                    {editItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} c/u</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleUpdateItemQty(item.id, item.qty - 1)}
                            disabled={item.qty <= 1}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-bold">{item.qty}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => handleUpdateItemQty(item.id, item.qty + 1)}
                          >
                            +
                          </Button>
                        </div>

                        <div className="text-right min-w-[80px]">
                          <p className="font-bold">{formatCurrency(item.price * item.qty)}</p>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Propina Voluntaria:</label>
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      type="number" 
                      className="h-8 pl-6 text-right font-bold"
                      value={editTipAmount}
                      onChange={(e) => setEditTipAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Nuevo Total:</span>
                    <span className="text-primary">{formatCurrency(calculateEditTotals().total)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                <Button 
                  className="gradient-primary" 
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

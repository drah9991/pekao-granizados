import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Filter, Eye, Receipt, DollarSign, CalendarDays } from "lucide-react";
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
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    fetchCurrentUserStoreId();
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
                          <TableCell className="font-bold">{formatCurrency(order.total)}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusConfig?.color || "bg-gray-500"}`}>
                              {statusConfig?.label || order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:text-primary hover:bg-primary/10"
                              onClick={() => handleViewDetails(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
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
                  <div className="flex justify-between font-bold text-lg pt-1">
                    <span>Total Pagado</span>
                    <span className="text-primary">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4">
                  <span>Atendido por: {selectedOrder.creator_profile?.name || 'N/A'}</span>
                  <span>Pago: {selectedOrder.payment ? Object.values(selectedOrder.payment)[0] as string : 'Efectivo'}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

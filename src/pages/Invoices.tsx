import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Eye, Search, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface Invoice {
  id: string;
  order: {
    status: string;
    total: number;
    subtotal: number;
    created_at: string;
    customer_details: { name: string } | null;
  };
}

const statusColors = {
  paid: { label: "Pagada", variant: "default" as const, backendStatus: "completed" },
  pending: { label: "Pendiente", variant: "secondary" as const, backendStatus: "pending" },
  cancelled: { label: "Anulada", variant: "destructive" as const, backendStatus: "cancelled" },
};

interface AvailableOrder {
  id: string;
  total: number;
  created_at: string;
  customer_name: string | null;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { storeId } = useAuth();

  // Manual Invoice Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<AvailableOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // View Invoice Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (storeId) {
      fetchInvoices();
    }
  }, [storeId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          order:orders!inner(
            status,
            total,
            subtotal,
            created_at,
            store_id,
            customer_details:customers!orders_customer_id_fkey(name)
          )
        `)
        .eq('order.store_id', storeId);

      if (error) throw error;
      
      const formattedData = (data as any) || [];
      formattedData.sort((a: any, b: any) => new Date(b.order?.created_at || 0).getTime() - new Date(a.order?.created_at || 0).getTime());
      
      setInvoices(formattedData);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast.error("Error al cargar facturas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    if (!storeId) return;
    setLoadingOrders(true);
    try {
      // Get all completed orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          total,
          created_at,
          customer_details:customers!orders_customer_id_fkey(name)
        `)
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Get all existing invoice order_ids
      const { data: existingInvoices, error: invoicesError } = await supabase
        .from("invoices")
        .select('order_id');
        
      if (invoicesError) throw invoicesError;

      const invoicedOrderIds = new Set(existingInvoices?.map(inv => inv.order_id));
      
      // Filter out orders that already have an invoice
      const available = orders?.filter(order => !invoicedOrderIds.has(order.id)).map(order => ({
        id: order.id,
        total: order.total,
        created_at: order.created_at,
        customer_name: (order.customer_details as any)?.name || 'Cliente General'
      })) || [];

      setAvailableOrders(available);
    } catch (error: any) {
      console.error("Error fetching available orders:", error);
      toast.error("Error al cargar pedidos disponibles");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchAvailableOrders();
    setSelectedOrderId("");
  };

  const handleCreateManualInvoice = async () => {
    if (!selectedOrderId) {
      toast.error("Por favor selecciona un pedido");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedOrder = availableOrders.find(o => o.id === selectedOrderId);
      
      const { error } = await supabase
        .from('invoices')
        .insert({
          order_id: selectedOrderId,
          issue_date: new Date().toISOString(),
          total_amount: selectedOrder?.total || 0
        } as any);

      if (error) throw error;

      toast.success("Factura generada exitosamente");
      setIsModalOpen(false);
      fetchInvoices(); // Refresh the list
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast.error("Error al generar la factura: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handlePrintInvoice = (invoiceToPrint: Invoice | null = selectedInvoice) => {
    if (!invoiceToPrint) return;

    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) {
      toast.error('Por favor permite los popups para imprimir la factura');
      return;
    }

    const orderDate = invoiceToPrint.order?.created_at ? new Date(invoiceToPrint.order.created_at).toLocaleString('es-CO') : 'Fecha no disponible';
    const customerName = invoiceToPrint.order?.customer_details?.name || 'Cliente General';
    const totalAmount = formatCurrency(invoiceToPrint.order?.total || 0);
    const invoiceNumber = `F-${invoiceToPrint.id.slice(0, 8).toUpperCase()}`;

    printWindow.document.write('<html><head><title>Factura ' + invoiceNumber + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: sans-serif; padding: 40px; }');
    printWindow.document.write('.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ccc; padding-bottom: 20px; }');
    printWindow.document.write('.details { margin-bottom: 30px; }');
    printWindow.document.write('.total { font-size: 24px; font-weight: bold; margin-top: 30px; text-align: right; }');
    printWindow.document.write('</style></head><body>');
    
    printWindow.document.write('<div class="header">');
    printWindow.document.write('<h1>Factura Electrónica</h1>');
    printWindow.document.write('<h2>' + invoiceNumber + '</h2>');
    printWindow.document.write('</div>');

    printWindow.document.write('<div class="details">');
    printWindow.document.write('<p><strong>Fecha de Emisión:</strong> ' + orderDate + '</p>');
    printWindow.document.write('<p><strong>Cliente:</strong> ' + customerName + '</p>');
    printWindow.document.write('<p><strong>Estado del Pedido:</strong> ' + (invoiceToPrint.order?.status === 'completed' ? 'Pagado' : 'Pendiente') + '</p>');
    printWindow.document.write('</div>');

    printWindow.document.write('<div class="total" style="font-size: 16px; font-weight: normal; margin-top: 10px; margin-bottom: 5px;">');
    printWindow.document.write('Subtotal: ' + formatCurrency(invoiceToPrint.order?.subtotal || invoiceToPrint.order?.total || 0));
    printWindow.document.write('</div>');


    printWindow.document.write('<div class="total">');
    printWindow.document.write('Total Pagado: ' + totalAmount);
    printWindow.document.write('</div>');

    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const filteredInvoices = invoices.filter(invoice =>
    !searchQuery ||
    invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (invoice.order.customer_details?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const today = new Date().toDateString();
  const invoicesToday = invoices.filter(inv => inv.order?.created_at && new Date(inv.order.created_at).toDateString() === today);
  const totalToday = invoicesToday.reduce((sum, inv) => sum + Number(inv.order?.total || 0), 0);

  const currentMonth = new Date().getMonth();
  const invoicesThisMonth = invoices.filter(inv => inv.order?.created_at && new Date(inv.order.created_at).getMonth() === currentMonth);
  const totalThisMonth = invoicesThisMonth.reduce((sum, inv) => sum + Number(inv.order?.total || 0), 0);

  const pendingInvoices = invoices.filter(inv => inv.order?.status === 'pending');
  const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + Number(inv.order?.total || 0), 0);

  const getStatusDisplay = (backendStatus: string) => {
    if (backendStatus === 'completed') return statusColors.paid;
    if (backendStatus === 'cancelled') return statusColors.cancelled;
    return statusColors.pending;
  };

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6 md:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-hero bg-clip-text text-transparent">
              Facturación
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">Gestión de facturas y documentos fiscales</p>
          </div>
          <Button className="gradient-primary shadow-glow" onClick={handleOpenModal}>
            <PlusCircle className="mr-2 w-5 h-5" />
            Nueva Factura Manual
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Facturado Hoy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-1">{formatCurrency(totalToday)}</div>
              <p className="text-xs text-muted-foreground">{invoicesToday.length} facturas emitidas hoy</p>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{formatCurrency(totalThisMonth)}</div>
              <p className="text-xs text-accent font-medium">{invoicesThisMonth.length} facturas en total</p>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Por Cobrar (Pendientes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary mb-1">{pendingInvoices.length}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(pendingTotal)} por cobrar</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por número o cliente..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Invoices List */}
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Facturas Emitidas</CardTitle>
            <CardDescription>{filteredInvoices.length} documentos encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando facturas...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay facturas</h3>
                <p className="text-muted-foreground">Aún no se han generado facturas fiscales de las órdenes.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice) => {
                  const status = getStatusDisplay(invoice.order?.status || 'completed');
                  return (
                    <div
                      key={invoice.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-xl hover:bg-accent/5 transition-smooth gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center shadow-card shrink-0">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-base">F-{invoice.id.slice(0, 8).toUpperCase()}</h3>
                            <Badge variant={status.variant} className="text-[10px] sm:text-xs">
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">
                            {invoice.order?.customer_details?.name || "Cliente General"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {invoice.order?.created_at ? new Date(invoice.order.created_at).toLocaleString('es-CO') : 'Fecha no disponible'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                        <div className="text-left md:text-right">
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(invoice.order?.total || 0)}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewInvoice(invoice)}
                            className="h-10 w-10 shrink-0"
                            title="Ver Factura"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePrintInvoice(invoice)}
                            className="h-10 w-10 shrink-0"
                            title="Descargar / Imprimir"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Invoice Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nueva Factura Manual</DialogTitle>
              <DialogDescription>
                Selecciona un pedido completado que aún no tenga factura generada.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {loadingOrders ? (
                 <div className="flex items-center justify-center p-4">
                   <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                 </div>
              ) : availableOrders.length === 0 ? (
                <div className="text-center p-4 bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">No hay pedidos disponibles sin facturar.</p>
                </div>
              ) : (
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar pedido..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {new Date(order.created_at).toLocaleDateString()} - {order.customer_name} - {formatCurrency(order.total)} (ID: {order.id.slice(0,8)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter className="sm:justify-end">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateManualInvoice}
                disabled={!selectedOrderId || isSubmitting}
                className="gradient-primary"
              >
                {isSubmitting ? "Generando..." : "Generar Factura"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Invoice Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Detalles de Factura</DialogTitle>
              <DialogDescription>
                Información del documento electrónico
              </DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="py-4 space-y-4">
                <div className="flex justify-between items-center bg-muted/20 p-4 rounded-lg">
                  <div>
                    <h3 className="font-bold text-lg">F-{selectedInvoice.id.slice(0, 8).toUpperCase()}</h3>
                    <p className="text-sm text-muted-foreground">ID Interno: {selectedInvoice.id}</p>
                  </div>
                  <Badge variant={getStatusDisplay(selectedInvoice.order?.status || 'completed').variant}>
                    {getStatusDisplay(selectedInvoice.order?.status || 'completed').label}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha de Emisión</p>
                    <p className="font-medium text-sm">{selectedInvoice.order?.created_at ? new Date(selectedInvoice.order.created_at).toLocaleString('es-CO') : 'Fecha no disponible'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                    <p className="font-medium text-sm">{selectedInvoice.order?.customer_details?.name || 'Cliente General'}</p>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-muted-foreground text-sm">Subtotal</p>
                    <p className="font-medium text-sm">{formatCurrency(selectedInvoice.order?.subtotal || selectedInvoice.order?.total || 0)}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2 border-t pt-2">
                    <p className="font-bold text-lg">Total Pagado</p>
                    <p className="font-bold text-2xl text-primary">{formatCurrency(selectedInvoice.order?.total || 0)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsViewModalOpen(false)}>
                Cerrar
              </Button>
              <Button 
                type="button" 
                onClick={() => handlePrintInvoice()}
                className="gradient-primary"
              >
                <Download className="w-4 h-4 mr-2" />
                Imprimir / PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </Layout >
  );
}
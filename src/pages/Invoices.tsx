import { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Eye, Search, PlusCircle, Printer, CalendarDays, TrendingUp, DollarSign, Clock, Receipt, Calculator, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  paid: { label: "LIBERADO", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500", glowClass: "shadow-glow-pro" },
  pending: { label: "EN TRÁMITE", bgClass: "bg-amber-500/10", textClass: "text-amber-500", glowClass: "shadow-glow-pro" },
  cancelled: { label: "ANULADA", bgClass: "bg-red-500/10", textClass: "text-red-500", glowClass: "shadow-glow-pro" },
};

interface AvailableOrder {
  id: string;
  total: number;
  created_at: string;
  customer_name: string | null;
}

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

      const { data: existingInvoices, error: invoicesError } = await supabase
        .from("invoices")
        .select('order_id');
        
      if (invoicesError) throw invoicesError;

      const invoicedOrderIds = new Set(existingInvoices?.map(inv => inv.order_id));
      
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
      fetchInvoices();
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
    const totalAmount = formatCOP(invoiceToPrint.order?.total || 0);
    const invoiceNumber = `F-${invoiceToPrint.id.slice(0, 8).toUpperCase()}`;

    printWindow.document.write('<html><head><title>Factura ' + invoiceNumber + '</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: sans-serif; padding: 40px; }');
    printWindow.document.write('.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ccc; padding-bottom: 20px; }');
    printWindow.document.write('.details { margin-bottom: 30px; }');
    printWindow.document.write('.total { font-size: 24px; font-weight: bold; margin-top: 30px; text-align: right; }');
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<div class="header"><h1>Factura Electrónica</h1><h2>' + invoiceNumber + '</h2></div>');
    printWindow.document.write('<div class="details"><p><strong>Fecha de Emisión:</strong> ' + orderDate + '</p><p><strong>Cliente:</strong> ' + customerName + '</p></div>');
    printWindow.document.write('<div class="total" style="font-size: 16px; font-weight: normal; margin-top: 10px; margin-bottom: 5px;">Subtotal: ' + formatCOP(invoiceToPrint.order?.subtotal || invoiceToPrint.order?.total || 0) + '</div>');
    printWindow.document.write('<div class="total">Total Pagado: ' + totalAmount + '</div>');
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

  const todayStr = new Date().toDateString();
  const invoicesToday = invoices.filter(inv => inv.order?.created_at && new Date(inv.order.created_at).toDateString() === todayStr);
  const totalToday = invoicesToday.reduce((sum, inv) => sum + Number(inv.order?.total || 0), 0);

  const pendingInvoices = invoices.filter(inv => inv.order?.status === 'pending');
  const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + Number(inv.order?.total || 0), 0);

  const getStatusDisplay = (backendStatus: string) => {
    if (backendStatus === 'completed') return statusColors.paid;
    if (backendStatus === 'cancelled') return statusColors.cancelled;
    return statusColors.pending;
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
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
              Módulo Fiscal
            </h1>
            <p className="text-primary font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
              Gestión Documental Pro Max • Compliance Standard
            </p>
          </div>
          <Button 
            className="h-14 px-8 rounded-[1.5rem] bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all gap-3"
            onClick={handleOpenModal}
          >
            <PlusCircle className="w-5 h-5" />
            Emisión Manual
          </Button>
        </motion.div>

        {/* Financial Bento Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "EMITIDO HOY", icon: Receipt, val: formatCOP(totalToday), sub: `${invoicesToday.length} Comprobantes`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "FISCALIZACIÓN TOTAL", icon: Calculator, val: formatCOP(invoices.reduce((s, i) => s + (i.order?.total || 0), 0)), sub: `${invoices.length} Documentos Totales`, color: "text-indigo-500", bg: "bg-indigo-500/10" },
            { label: "CUENTAS POR COBRAR", icon: Clock, val: formatCOP(pendingTotal), sub: `${pendingInvoices.length} Pendientes`, color: "text-amber-500", bg: "bg-amber-500/10", glow: pendingInvoices.length > 0 }
          ].map((kpi, i) => (
            <Card key={i} className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">{kpi.label}</span>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-pro", kpi.bg, kpi.color)}>
                    <kpi.icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl lg:text-4xl font-black font-space-grotesk italic text-foreground tracking-tighter mb-2">
                  {kpi.val.replace("$", "")}
                </div>
                <div className="flex items-center gap-2">
                   {kpi.glow && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-glow-pro" />}
                   <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest italic">{kpi.sub}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Filter Bar */}
        <motion.div variants={itemVariants} className="relative max-w-xl group">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="BUSCAR POR PREFIJO F- O IDENTIDAD CLIENTE..."
            className="pl-16 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 shadow-pro"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </motion.div>

        {/* Invoice Audit Table */}
        <motion.div variants={itemVariants}>
          <Card className="bg-muted border border-border rounded-[3.5rem] p-10 shadow-pro glass-pro overflow-hidden">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground leading-none">Registro de Comprobantes</h2>
              <div className="flex items-center gap-3 bg-muted/60 px-4 h-9 rounded-full border border-border font-black text-[9px] text-muted-foreground italic uppercase">
                 <LayoutGrid className="w-3.5 h-3.5" /> Listado Auditado
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6 shadow-glow-pro" />
                <p className="text-primary font-black uppercase tracking-widest text-[10px] italic animate-pulse">Indexando registros fiscales...</p>
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 opacity-30">
                <FileText className="w-20 h-20 mb-6 text-foreground" />
                <h3 className="text-xl font-black italic uppercase tracking-widest text-foreground">LIBRO VACÍO</h3>
                <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] mt-2 text-center">No se han emitido facturas en este periodo fiscal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInvoices.map((invoice, idx) => {
                  const status = getStatusDisplay(invoice.order?.status || 'completed');
                  return (
                    <motion.div
                      key={invoice.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-muted/40 border border-border rounded-[2rem] hover:bg-muted/80 hover:border-primary/20 hover:shadow-pro transition-all group"
                    >
                      <div className="flex items-center gap-6 flex-1">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-pro group-hover:scale-110 transition-transform">
                          <Receipt className="w-7 h-7 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-black italic font-space-grotesk text-lg text-foreground tracking-tight">F-{invoice.id.slice(0, 8).toUpperCase()}</h3>
                            <div className={cn("px-3 py-1 rounded-full text-[9px] font-black italic uppercase tracking-widest border", status.bgClass, status.textClass, "border-border/50")}>
                              {status.label}
                            </div>
                          </div>
                          <p className="text-xs font-black text-muted-foreground/60 italic uppercase truncate">
                            {invoice.order?.customer_details?.name || "VENTA GENERAL"}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-muted-foreground/40 italic italic font-space-grotesk lowercase">
                             <CalendarDays className="w-3 h-3 text-primary" />
                             {invoice.order?.created_at ? format(new Date(invoice.order.created_at), "dd MMM yyyy '—' HH:mm", { locale: es }) : 'AUDIT FAIL'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between lg:justify-end gap-8 w-full lg:w-auto mt-6 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-t-0 border-border">
                        <div className="text-left lg:text-right">
                          <p className="text-xl lg:text-2xl font-black italic font-space-grotesk text-emerald-500 shadow-glow-pro-text tabular-nums">
                            {formatCOP(invoice.order?.total || 0)}
                          </p>
                          <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">Sub: {formatCOP(invoice.order?.subtotal || 0)}</p>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" size="icon" className="w-11 h-11 rounded-xl bg-muted/20 border border-border hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" size="icon" className="w-11 h-11 rounded-xl bg-muted/20 border border-border hover:bg-indigo-500/20 hover:text-indigo-400 transition-all shadow-pro"
                            onClick={() => handlePrintInvoice(invoice)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Manual Invoice Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border rounded-[3rem] text-foreground shadow-pro">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                    <Receipt className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                    <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Emisión Manual</DialogTitle>
                    <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Asignar Certificación Fiscal a Operación Existente</DialogDescription>
                 </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="p-6 glass-pro bg-white/5 rounded-[2rem] border border-white/5">
                <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 italic px-2 mb-3">CONCATENAR CON OPERACIÓN LIBERADA</Label>
                {loadingOrders ? (
                   <div className="flex items-center justify-center p-12">
                     <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full shadow-glow-pro" />
                   </div>
                ) : availableOrders.length === 0 ? (
                  <div className="text-center p-12 opacity-30">
                    <Receipt className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase italic tracking-widest">Sin operaciones huérfanas disponibles.</p>
                  </div>
                ) : (
                  <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                    <SelectTrigger className="h-16 bg-muted border-border rounded-2xl text-[10px] font-black italic uppercase font-space-grotesk">
                      <SelectValue placeholder="SELECCIONAR VECTOR TRANSACCIONAL..." />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border rounded-2xl">
                      {availableOrders.map((order) => (
                        <SelectItem key={order.id} value={order.id} className="p-4 border-b border-border last:border-0 rounded-none hover:bg-muted/80">
                           <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase italic">ID: #{order.id.slice(0,8)} • {order.customer_name}</span>
                              <span className="text-[9px] text-emerald-500 font-black italic tabular-nums">LIQUIDACIÓN: {formatCOP(order.total)}</span>
                           </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5">ABORTAR</Button>
                <Button 
                  onClick={handleCreateManualInvoice}
                  disabled={!selectedOrderId || isSubmitting}
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:shadow-primary/40 transition-all font-space-grotesk"
                >
                  {isSubmitting ? "CERTIFICANDO..." : "EMITIR DOCUMENTO ✓"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Invoice Modal */}
        <AnimatePresence>
          {isViewModalOpen && (
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
              <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border rounded-[3rem] text-foreground shadow-pro animate-in zoom-in-95 duration-300">
                <DialogHeader className="mb-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center shadow-glow-pro">
                         <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                         <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Copia Fiscal</DialogTitle>
                         <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Visualización Auditada</DialogDescription>
                      </div>
                   </div>
                </DialogHeader>

                {selectedInvoice && (
                  <div className="space-y-6">
                    <div className="p-6 glass-pro rounded-[2rem] border border-border bg-muted/40 space-y-4">
                       <div className="flex items-center justify-between border-b border-border pb-4">
                          <div>
                             <p className="text-[9px] font-black uppercase text-white/20 italic tracking-widest">NÚMERO DE COMPROBANTE</p>
                             <h3 className="text-2xl font-black italic font-space-grotesk text-white">F-{selectedInvoice.id.slice(0, 8).toUpperCase()}</h3>
                          </div>
                          <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-widest", getStatusDisplay(selectedInvoice.order?.status || 'completed').bgClass, getStatusDisplay(selectedInvoice.order?.status || 'completed').textClass)}>
                             {getStatusDisplay(selectedInvoice.order?.status || 'completed').label}
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <p className="text-[9px] font-black uppercase text-white/20 italic tracking-widest">VECTOR FECHA</p>
                             <p className="text-xs font-black italic font-space-grotesk">{selectedInvoice.order?.created_at ? format(new Date(selectedInvoice.order.created_at), "dd/MM/yyyy HH:mm", { locale: es }) : 'FAIL'}</p>
                          </div>
                          <div>
                             <p className="text-[9px] font-black uppercase text-white/20 italic tracking-widest">IDENTIDAD CLIENTE</p>
                             <p className="text-xs font-black italic font-space-grotesk uppercase truncate">{selectedInvoice.order?.customer_details?.name || 'VENTA GENERAL'}</p>
                          </div>
                       </div>
                    </div>

                    <div className="p-8 glass-pro rounded-[2.5rem] border border-border bg-emerald-500/5">
                        <div className="flex justify-between items-center mb-1 text-[10px] font-black uppercase italic text-muted-foreground/40">
                           <span>BASE IMPONIBLE (SUBTOTAL)</span>
                           <span className="text-foreground">{formatCOP(selectedInvoice.order?.subtotal || selectedInvoice.order?.total || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-border mt-4">
                           <span className="text-xs font-black uppercase tracking-widest text-emerald-500/60 italic">TOTAL PAGADO</span>
                           <span className="text-2xl lg:text-4xl font-black italic font-space-grotesk text-emerald-500 shadow-glow-pro-text">{formatCOP(selectedInvoice.order?.total || 0)}</span>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <Button variant="ghost" onClick={() => setIsViewModalOpen(false)} className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-white/40 hover:text-white hover:bg-white/5">CERRAR</Button>
                      <Button onClick={() => handlePrintInvoice()} className="flex-1 h-14 rounded-2xl bg-indigo-600 text-white font-black italic uppercase tracking-widest shadow-glow-pro hover:bg-indigo-500 transition-all gap-2">
                        <Printer className="w-4 h-4" /> IMPRIMIR LOG
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout >
  );
}

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <span className={cn("block", className)}>{children}</span>
);
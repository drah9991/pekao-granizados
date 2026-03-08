import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Invoice {
  id: string;
  number: number;
  issued_at: string;
  total: number;
  pdf_path: string | null;
  order: {
    status: string;
    customer_details: { name: string } | null;
  };
}

const statusColors = {
  paid: { label: "Pagada", variant: "default" as const, backendStatus: "completed" },
  pending: { label: "Pendiente", variant: "secondary" as const, backendStatus: "pending" },
  cancelled: { label: "Anulada", variant: "destructive" as const, backendStatus: "cancelled" },
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { storeId } = useAuth();

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
          number,
          issued_at,
          total,
          pdf_path,
          order:orders!inner(
            status,
            store_id,
            customer_details:customers!orders_customer_id_fkey(name)
          )
        `)
        .eq('order.store_id', storeId)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      setInvoices((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast.error("Error al cargar facturas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    !searchQuery ||
    invoice.number.toString().includes(searchQuery) ||
    (invoice.order.customer_details?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const today = new Date().toDateString();
  const invoicesToday = invoices.filter(inv => new Date(inv.issued_at).toDateString() === today);
  const totalToday = invoicesToday.reduce((sum, inv) => sum + Number(inv.total), 0);

  const currentMonth = new Date().getMonth();
  const invoicesThisMonth = invoices.filter(inv => new Date(inv.issued_at).getMonth() === currentMonth);
  const totalThisMonth = invoicesThisMonth.reduce((sum, inv) => sum + Number(inv.total), 0);

  const pendingInvoices = invoices.filter(inv => inv.order.status === 'pending');
  const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

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
          <Button className="gradient-primary shadow-glow">
            <FileText className="mr-2 w-5 h-5" />
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
                            <h3 className="font-bold text-base">F-{invoice.number.toString().padStart(6, '0')}</h3>
                            <Badge variant={status.variant} className="text-[10px] sm:text-xs">
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">
                            {invoice.order?.customer_details?.name || "Cliente General"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(invoice.issued_at).toLocaleString('es-CO')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                        <div className="text-left md:text-right">
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(invoice.total)}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => toast.info("Ver detalles factura #" + invoice.number)}
                            className="h-10 w-10 shrink-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              if (invoice.pdf_path) {
                                window.open(invoice.pdf_path, '_blank');
                              } else {
                                toast.error("Documento PDF no disponible");
                              }
                            }}
                            className="h-10 w-10 shrink-0"
                            disabled={!invoice.pdf_path}
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
      </div>
    </Layout >
  );
}
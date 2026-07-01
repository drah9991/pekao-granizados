import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatCOP } from "@/lib/currency";

export interface Invoice {
  id: string;
  order: {
    status: string;
    total: number;
    subtotal: number;
    created_at: string;
    customer_details: { name: string } | null;
  };
}

export function useInvoices() {
  const { storeId } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Record<string, unknown>[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          order:orders!inner(
            status, total, subtotal, created_at, store_id,
            customer_details:customers!orders_customer_id_fkey(name)
          )
        `)
        .eq('order.store_id', storeId);

      if (error) throw error;
      const sorted = (data || []).sort((a: Invoice, b: Invoice) => 
        new Date(b.order?.created_at || 0).getTime() - new Date(a.order?.created_at || 0).getTime()
      );
      setInvoices(sorted);
    } catch (error: unknown) {
      console.error("Error fetching invoices:", error);
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableOrders = async () => {
    if (!storeId) return;
    setLoadingOrders(true);
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select(`id, total, created_at, customer_details:customers!orders_customer_id_fkey(name)`)
        .eq('store_id', storeId)
        .eq('status', 'completed');

      const { data: existingInvoices } = await supabase.from("invoices").select('order_id');
      const invoicedIds = new Set(existingInvoices?.map(inv => inv.order_id));
      
      const available = orders?.filter(o => !invoicedIds.has(o.id)).map(o => ({
        id: o.id,
        total: o.total,
        created_at: o.created_at,
        customer_name: o.customer_details?.name || 'Cliente General'
      })) || [];

      setAvailableOrders(available);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCreateManualInvoice = async () => {
    if (!selectedOrderId) return;
    setIsSubmitting(true);
    try {
      const selectedOrder = availableOrders.find(o => o.id === selectedOrderId);
      const { error } = await supabase.from('invoices').insert({
        order_id: selectedOrderId,
        issue_date: new Date().toISOString(),
        total_amount: selectedOrder?.total || 0
      });
      if (error) throw error;
      toast.success("Factura generada");
      setIsModalOpen(false);
      fetchInvoices();
    } catch (error: unknown) {
      console.error("Error creating invoice:", error);
      toast.error("Error al generar factura");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    // Escape helper to prevent DOM-based XSS in document.write
    const esc = (v: unknown) => String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

    const invoiceNumber = `F-${esc(invoice.id.slice(0, 8).toUpperCase())}`;
    const safeDate = esc(new Date(invoice.order.created_at).toLocaleString());
    const safeCustomer = esc(invoice.order.customer_details?.name || 'Cliente General');
    const safeTotal = esc(formatCOP(invoice.order.total));

    printWindow.document.write(`
      <html><head><title>Factura ${invoiceNumber}</title>
      <style>body { font-family: sans-serif; padding: 40px; } .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; } .total { font-size: 24px; font-weight: bold; margin-top: 30px; text-align: right; }</style>
      </head><body>
      <div class="header"><h1>Factura Electrónica</h1><h2>${invoiceNumber}</h2></div>
      <p><strong>Fecha:</strong> ${safeDate}</p>
      <p><strong>Cliente:</strong> ${safeCustomer}</p>
      <div class="total">Total: ${safeTotal}</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  useEffect(() => { fetchInvoices(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const filteredInvoices = invoices.filter(inv =>
    !searchQuery || 
    inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inv.order.customer_details?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return {
    invoices: filteredInvoices,
    loading,
    searchQuery, setSearchQuery,
    isModalOpen, setIsModalOpen,
    availableOrders,
    selectedOrderId, setSelectedOrderId,
    isSubmitting,
    loadingOrders,
    isViewModalOpen, setIsViewModalOpen,
    selectedInvoice, setSelectedInvoice,
    fetchAvailableOrders,
    handleCreateManualInvoice,
    handlePrintInvoice,
    refreshInvoices: fetchInvoices
  };
}

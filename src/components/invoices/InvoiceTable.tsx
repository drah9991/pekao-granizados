import React from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Eye, Printer, LayoutGrid, CalendarDays, FileText } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Invoice } from "@/hooks/useInvoices";

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  onView: (inv: Invoice) => void;
  onPrint: (inv: Invoice) => void;
}

const statusColors: Record<string, { label: string; bgClass: string; textClass: string }> = {
  paid: { label: "LIBERADO", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500" },
  completed: { label: "LIBERADO", bgClass: "bg-emerald-500/10", textClass: "text-emerald-500" },
  pending: { label: "EN TRÁMITE", bgClass: "bg-amber-500/10", textClass: "text-amber-500" },
  cancelled: { label: "ANULADA", bgClass: "bg-red-500/10", textClass: "text-red-500" },
};

export default function InvoiceTable({ invoices, loading, onView, onPrint }: InvoiceTableProps) {
  return (
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
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 opacity-30">
          <FileText className="w-20 h-20 mb-6 text-foreground" />
          <h3 className="text-xl font-black italic uppercase tracking-widest text-foreground">LIBRO VACÍO</h3>
          <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] mt-2 text-center">No se han emitido facturas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice, idx) => {
            const status = statusColors[invoice.order.status ?? ''] || statusColors.pending;
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
                      {invoice.order.customer_details?.name || "VENTA GENERAL"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-muted-foreground/40 italic italic font-space-grotesk lowercase">
                       <CalendarDays className="w-3 h-3 text-primary" />
                       {format(new Date(invoice.order.created_at), "dd MMM yyyy '—' HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-8 w-full lg:w-auto mt-6 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-t-0 border-border">
                  <div className="text-left lg:text-right">
                    <p className="text-xl lg:text-2xl font-black italic font-space-grotesk text-emerald-500 shadow-glow-pro-text tabular-nums">
                      {formatCOP(invoice.order.total)}
                    </p>
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] italic">Sub: {formatCOP(invoice.order.subtotal)}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" size="icon" className="w-11 h-11 rounded-xl bg-muted/20 border border-border hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                      onClick={() => onView(invoice)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" size="icon" className="w-11 h-11 rounded-xl bg-muted/20 border border-border hover:bg-indigo-500/20 hover:text-indigo-400 transition-all shadow-pro"
                      onClick={() => onPrint(invoice)}
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
  );
}

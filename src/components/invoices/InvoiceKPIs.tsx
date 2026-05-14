import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Calculator, Clock } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Invoice } from "@/hooks/useInvoices";

interface InvoiceKPIsProps {
  invoices: Invoice[];
}

export default function InvoiceKPIs({ invoices }: InvoiceKPIsProps) {
  const todayStr = new Date().toDateString();
  const todayInvoices = invoices.filter(inv => new Date(inv.order.created_at).toDateString() === todayStr);
  const totalToday = todayInvoices.reduce((sum, inv) => sum + inv.order.total, 0);
  const totalFiscal = invoices.reduce((sum, inv) => sum + inv.order.total, 0);
  const pendingInvoices = invoices.filter(inv => inv.order.status === 'pending');
  const pendingTotal = pendingInvoices.reduce((sum, inv) => sum + inv.order.total, 0);

  const kpis = [
    { label: "EMITIDO HOY", icon: Receipt, val: formatCOP(totalToday), sub: `${todayInvoices.length} Comprobantes`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "FISCALIZACIÓN TOTAL", icon: Calculator, val: formatCOP(totalFiscal), sub: `${invoices.length} Documentos`, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "CUENTAS POR COBRAR", icon: Clock, val: formatCOP(pendingTotal), sub: `${pendingInvoices.length} Pendientes`, color: "text-amber-500", bg: "bg-amber-500/10", glow: pendingInvoices.length > 0 }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {kpis.map((kpi, i) => (
        <Card key={kpi.label} className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
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
    </div>
  );
}

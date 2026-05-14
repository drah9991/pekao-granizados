import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, ShoppingBag, TrendingUp, Clock } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SalesKPIsProps {
  stats: {
    totalRevenue: number;
    completedCount: number;
    pendingCount: number;
    avgTicket: number;
    totalCount: number;
  };
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export function SalesKPIs({ stats }: SalesKPIsProps) {
  const kpis = [
    { label: "INGRESOS FILTRADOS", icon: DollarSign, val: formatCOP(stats.totalRevenue), sub: "Completados", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "PEDIDOS EXITOSOS", icon: ShoppingBag, val: stats.completedCount, sub: `De ${stats.totalCount} totales`, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "TICKET PROMEDIO", icon: TrendingUp, val: formatCOP(stats.avgTicket), sub: "Venta Media", color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "ÓRDENES PENDIENTES", icon: Clock, val: stats.pendingCount, sub: stats.pendingCount > 0 ? "Requieren Acción" : "Todo al día", color: "text-amber-500", bg: "bg-amber-500/10", glow: stats.pendingCount > 0 }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, i) => (
        <motion.div key={kpi.label} variants={itemVariants}>
          <Card className="bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
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
        </motion.div>
      ))}
    </div>
  );
}

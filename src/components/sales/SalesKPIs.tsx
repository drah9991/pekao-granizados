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
    { 
      label: "INGRESOS FILTRADOS", 
      icon: DollarSign, 
      val: formatCOP(stats.totalRevenue), 
      sub: "Completados", 
      color: "text-emerald-400", 
      bg: "bg-emerald-500/10",
      cardStyle: "border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.06)] hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] bg-emerald-950/5"
    },
    { 
      label: "PEDIDOS EXITOSOS", 
      icon: ShoppingBag, 
      val: stats.completedCount, 
      sub: `De ${stats.totalCount} totales`, 
      color: "text-indigo-400", 
      bg: "bg-indigo-500/10",
      cardStyle: "border-indigo-500/30 hover:border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.06)] hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] bg-indigo-950/5"
    },
    { 
      label: "TICKET PROMEDIO", 
      icon: TrendingUp, 
      val: formatCOP(stats.avgTicket), 
      sub: "Venta Media", 
      color: "text-teal-400", 
      bg: "bg-teal-500/10",
      cardStyle: "border-teal-500/30 hover:border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.06)] hover:shadow-[0_0_25px_rgba(20,184,166,0.15)] bg-teal-950/5"
    },
    { 
      label: "ÓRDENES PENDIENTES", 
      icon: Clock, 
      val: stats.pendingCount, 
      sub: stats.pendingCount > 0 ? "Requieren Acción" : "Todo al día", 
      color: "text-amber-400", 
      bg: "bg-amber-500/10", 
      glow: stats.pendingCount > 0,
      cardStyle: "border-amber-500/30 hover:border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.06)] hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] bg-amber-950/5"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, i) => (
        <motion.div key={kpi.label} variants={itemVariants}>
          <Card className={cn(
            "bg-muted border rounded-[2.5rem] glass-pro group hover:scale-[1.02] transition-all duration-500 overflow-hidden relative after:absolute after:inset-0 after:rounded-[2.5rem] after:bg-gradient-to-tr after:from-white/0 after:to-white/[0.02] after:pointer-events-none",
            kpi.cardStyle
          )}>
            <CardContent className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00F3FF] italic font-space-grotesk">{kpi.label}</span>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-pro transition-transform group-hover:scale-110 border border-current/20", kpi.bg, kpi.color)}>
                  <kpi.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl lg:text-4xl font-black font-space-grotesk italic text-white tracking-tighter mb-2 drop-shadow-md">
                {typeof kpi.val === 'string' ? kpi.val.replace("$", "") : kpi.val}
              </div>
              <div className="flex items-center gap-2">
                {kpi.glow ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F3FF]/60" />
                )}
                <span className="text-[10px] font-extrabold text-white/80 uppercase tracking-widest italic">{kpi.sub}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

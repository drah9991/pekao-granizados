import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Smartphone, CreditCard, TrendingUp } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CashKPIsProps {
  summary: {
    cash: number;
    transfer: number;
    qr: number;
    card: number;
  };
  stats: {
    cashPercentage: number;
    transferPercentage: number;
    cardPercentage: number;
    avgTicket: number;
  };
  orderCount: number;
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export function CashKPIs({ summary, stats, orderCount }: CashKPIsProps) {
  const kpis = [
    { label: "EFECTIVO", icon: Banknote, val: summary.cash, pct: stats.cashPercentage, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "DIGITAL", icon: Smartphone, val: summary.transfer + summary.qr, pct: stats.transferPercentage, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { label: "TARJETAS", icon: CreditCard, val: summary.card, pct: stats.cardPercentage, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "TICKET AVG", icon: TrendingUp, val: stats.avgTicket, pct: null, color: "text-primary", bg: "bg-primary/10" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((item, i) => (
        <motion.div key={i} variants={itemVariants}>
          <Card className="bg-[#1C1F26] border border-white/5 rounded-[2.5rem] shadow-pro glass-pro group hover:scale-[1.02] transition-all duration-500 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 grow italic font-space-grotesk">{item.label}</span>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-pro", item.bg, item.color)}>
                  <item.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl lg:text-3xl font-black font-space-grotesk italic text-white tracking-tighter mb-2">
                {formatCOP(item.val).replace("$", "")}
              </div>
              {item.pct !== null ? (
                <div className="flex items-center gap-2">
                  <div className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase italic", item.bg, item.color)}>
                    {item.pct}% DEL FLUJO
                  </div>
                </div>
              ) : (
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic">BASADO EN {orderCount} VENTAS</span>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

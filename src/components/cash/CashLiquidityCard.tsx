import { Card, CardContent } from "@/components/ui/card";
import { Wallet, Receipt, TrendingUp, Clock } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CashLiquidityCardProps {
  summary: {
    total: number;
    cash: number;
    transfer: number;
    qr: number;
    card: number;
  };
  stats: {
    avgTicket: number;
    cashPercentage: number;
    transferPercentage: number;
    cardPercentage: number;
  };
  orderCount: number;
  peakHour: string;
}

export function CashLiquidityCard({ summary, stats, orderCount, peakHour }: CashLiquidityCardProps) {
  return (
    <Card className="bg-card border border-border/50 rounded-[3rem] shadow-pro relative overflow-hidden glass-pro dim-layering group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 group-hover:opacity-70 transition-opacity" />
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[10rem] -translate-y-1/2 translate-x-1/2" />
      <CardContent className="p-10 lg:p-12 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
          <div className="flex items-center gap-8">
            <div className="w-24 h-24 bg-primary/20 rounded-[2rem] flex items-center justify-center border border-primary/30 shadow-glow-pro animate-pulse-subtle">
              <Wallet className="w-10 h-10 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-space-grotesk italic mb-3 block">DISPONIBILIDAD LÍQUIDA ACTUAL</span>
              <div className="text-3xl sm:text-5xl lg:text-8xl font-black tracking-tighter font-space-grotesk italic text-foreground flex items-baseline gap-2">
                {formatCOP(summary.total).replace("$", "")}
                <span className="text-xl lg:text-2xl text-primary font-black uppercase tracking-widest italic ml-2">COP</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest italic px-4 h-8">
                  <Receipt className="w-3.5 h-3.5 mr-2" />
                  {orderCount} VENTAS REGISTRADAS
                </Badge>
                <Badge className="bg-muted/40 text-muted-foreground border-border/50 text-[10px] font-black uppercase tracking-widest italic px-4 h-8">
                  <TrendingUp className="w-3.5 h-3.5 mr-2" />
                  TICKET AVG: {formatCOP(stats.avgTicket).replace("$", "")}
                </Badge>
                {peakHour !== '--' && (
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-black uppercase tracking-widest italic px-4 h-8">
                    <Clock className="w-3.5 h-3.5 mr-2" />
                    PICO: {peakHour}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-8 glass-pro rounded-[2.5rem] border border-border/50 min-w-[320px] shadow-glow-pro">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground font-space-grotesk italic mb-1">COMPOSICIÓN DE LIQUIDEZ</span>
            
            <div className="space-y-4">
              {[
                { label: "Efectivo", color: "bg-emerald-500", val: summary.cash, pct: stats.cashPercentage },
                { label: "Digital (Transf/QR)", color: "bg-cyan-500", val: summary.transfer + summary.qr, pct: stats.transferPercentage },
                { label: "Tarjetas", color: "bg-violet-500", val: summary.card, pct: stats.cardPercentage }
              ].map((item, idx) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", item.color)} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-[11px] font-black text-foreground italic font-space-grotesk">{formatCOP(item.val)}</span>
                  </div>
                  <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                      className={cn("h-full rounded-full transition-all shadow-glow-pro", item.color)} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

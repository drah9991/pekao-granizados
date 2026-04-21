import { Card } from "@/components/ui/card";
import { Zap, Layers, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface InventoryKPIsProps {
  stats: {
    totalStock: number;
    activeProducts: number;
    lowStockCount: number;
    isAnyLowStock: boolean;
  };
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export function InventoryKPIs({ stats }: InventoryKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <motion.div variants={itemVariants}>
        <Card className="bg-muted border border-border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">VOLUMEN FÍSICO</span>
            <Zap className="w-5 h-5 text-primary shadow-glow-pro" />
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black italic font-space-grotesk text-foreground tabular-nums tracking-tighter">{stats.totalStock}</div>
            <div className="text-primary font-black uppercase text-[10px] italic">Units in Orbit</div>
          </div>
          <div className="mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic relative z-10">Indexación total de almacén global</div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="bg-muted border border-border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative">
          <div className="flex items-center justify-between mb-8 relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic font-space-grotesk">CATÁLOGO ACTIVO</span>
            <Layers className="w-5 h-5 text-indigo-400 shadow-glow-pro" />
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black italic font-space-grotesk text-indigo-400 tabular-nums tracking-tighter">{stats.activeProducts}</div>
            <div className="text-indigo-400 font-black uppercase text-[10px] italic">SKUs Verified</div>
          </div>
          <div className="mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic relative z-10">Integridad rotacional del catálogo maestro</div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className={cn(
          "bg-muted border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative transition-all duration-700",
          stats.isAnyLowStock ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-border"
        )}>
          <div className="flex items-center justify-between mb-8 relative z-10">
            <span className={cn("text-[10px] font-black uppercase tracking-[0.3em] italic font-space-grotesk", stats.isAnyLowStock ? "text-rose-500" : "text-muted-foreground")}>NODOS CRÍTICOS</span>
            <AlertTriangle className={cn("w-5 h-5 shadow-glow-pro", stats.isAnyLowStock ? "text-rose-500 animate-pulse" : "text-muted-foreground/50")} />
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <div className={cn("text-4xl sm:text-5xl lg:text-6xl font-black italic font-space-grotesk tabular-nums tracking-tighter", stats.isAnyLowStock ? "text-rose-500" : "text-foreground")}>{stats.lowStockCount}</div>
            <div className={cn("font-black uppercase text-[10px] italic", stats.isAnyLowStock ? "text-rose-500" : "text-muted-foreground")}>Risk Points</div>
          </div>
          <div className="mt-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest italic relative z-10">Monitoreo de umbral de reabastecimiento</div>
          {stats.isAnyLowStock && <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />}
        </Card>
      </motion.div>
    </div>
  );
}

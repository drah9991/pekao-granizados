import { motion, AnimatePresence } from "framer-motion";
import { Tag, Zap, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/currency";
import { StockItem } from "@/types/inventory";

interface InventoryGridProps {
  items: StockItem[];
  onAdjust: (item: StockItem) => void;
  loading: boolean;
}

export function InventoryGrid({ items, onAdjust, loading }: InventoryGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow-pro" />
        <p className="text-primary font-black uppercase tracking-[0.4em] text-[10px] italic font-space-grotesk animate-pulse">Escaneando Registro de Movimientos...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
      <AnimatePresence mode="popLayout">
        {items.map((item, idx) => {
          const isLowStock = item.qty < item.min_qty;
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.02, type: "spring", damping: 20 }}
              className={cn(
                "bg-muted border rounded-[3rem] p-10 glass-pro group relative overflow-hidden transition-all duration-500",
                isLowStock ? "border-rose-500/30 bg-rose-500/[0.03] shadow-glow-pro" : "border-border hover:border-primary/20 hover:bg-muted/80 shadow-pro"
              )}
            >
              <div className="flex flex-col gap-8 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500",
                      isLowStock ? "bg-rose-500/20 border-rose-500/30 text-rose-500" : "bg-primary/10 border-primary/20 text-primary"
                    )}>
                      <Tag className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg lg:text-xl font-black italic font-space-grotesk text-foreground tracking-tighter leading-none group-hover:text-primary transition-colors truncate pr-2">
                        {item.product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full shadow-glow-pro", isLowStock ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                        <span className={cn("text-[9px] font-black uppercase italic tracking-widest", isLowStock ? "text-rose-500" : "text-muted-foreground font-bold")}>
                          {isLowStock ? "ALERTA: BAJO STOCK" : "NIVEL ÓPTIMO"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-muted/50 border border-border hover:border-primary/40 hover:text-primary transition-all"
                    onClick={() => onAdjust(item)}
                  >
                    <Zap className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-6 py-6 border-y border-border">
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] italic mb-2">Disponible</p>
                    <p className={cn("text-3xl sm:text-4xl lg:text-5xl font-black font-space-grotesk italic tracking-tighter", isLowStock ? "text-rose-500" : "text-foreground")}>
                      {item.qty}
                    </p>
                  </div>
                  <div className="w-px h-12 bg-border shrink-0" />
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] italic mb-2">Umbral Mín.</p>
                    <p className="text-2xl font-black font-space-grotesk italic tracking-tighter">
                      {item.min_qty}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[9px] font-black italic uppercase text-muted-foreground tracking-widest">{item.store.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-2 py-0 border-white/20 text-foreground bg-white/5">
                      {item.product.type}
                    </Badge>
                  </div>
                  <div className="flex items-baseline justify-between pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">Valuación Unit.</span>
                    <span className="text-xs font-black italic font-space-grotesk text-primary">{formatCOP(item.product.price)}</span>
                  </div>
                </div>
              </div>
              {isLowStock && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -translate-y-16 translate-x-16" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

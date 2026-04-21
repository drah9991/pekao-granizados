import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Calendar, User, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Movement } from "@/hooks/useMovements";

const typeMapping: Record<string, { label: string; icon: any; bg: string; text: string; glow: string }> = {
    entry: { label: "INYECCIÓN", icon: TrendingUp, bg: "bg-emerald-500/10", text: "text-emerald-500", glow: "shadow-emerald-500/20" },
    in: { label: "INYECCIÓN", icon: TrendingUp, bg: "bg-emerald-500/10", text: "text-emerald-500", glow: "shadow-emerald-500/20" },
    exit: { label: "EXTRACCIÓN", icon: TrendingDown, bg: "bg-rose-500/10", text: "text-rose-500", glow: "shadow-rose-500/20" },
    out: { label: "EXTRACCIÓN", icon: TrendingDown, bg: "bg-rose-500/10", text: "text-rose-500", glow: "shadow-rose-500/20" },
    sale: { label: "TRANSACCIÓN", icon: Activity, bg: "bg-indigo-500/10", text: "text-indigo-500", glow: "shadow-indigo-500/20" },
    waste: { label: "MERMA/DAÑO", icon: AlertTriangle, bg: "bg-amber-500/10", text: "text-amber-500", glow: "shadow-amber-500/20" },
};

interface MovementCardProps {
  mov: Movement;
  idx: number;
}

export default function MovementCard({ mov, idx }: MovementCardProps) {
    const typeData = typeMapping[mov.type] || { label: mov.type.toUpperCase(), icon: Activity, bg: "bg-gray-500/10", text: "text-gray-500", glow: "" };
    const isEntry = mov.type === 'in' || mov.type === 'entry';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: idx * 0.02 }}
            className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-muted/40 border border-border rounded-[2.5rem] hover:bg-muted/80 hover:border-primary/20 hover:shadow-pro transition-all group overflow-hidden relative"
        >
            <div className={cn("absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.05]", isEntry ? "bg-emerald-500" : "bg-rose-500")} />

            <div className="flex items-center gap-6 flex-1 relative z-10">
                <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-pro group-hover:scale-110 transition-transform duration-500 border", typeData.bg, typeData.text, "border-border/50")}>
                    <typeData.icon className={cn("w-7 h-7", typeData.glow)} />
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <div className={cn("px-4 py-1.5 rounded-full text-[9px] font-black italic uppercase tracking-[0.2em] border border-border/50 shadow-pro", typeData.bg, typeData.text)}>
                            {typeData.label}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/20 italic font-space-grotesk tracking-widest">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(mov.created_at), "dd MMM yyyy • HH:mm", { locale: es })}
                        </div>
                    </div>
                    <h3 className="text-base lg:text-xl font-black italic font-space-grotesk text-foreground tracking-tight group-hover:text-primary transition-colors truncate pr-2">
                        {mov.product?.name || "RECURSO INDETERMINADO"}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/40 italic uppercase tracking-widest">
                            <User className="w-3.5 h-3.5 text-primary" />
                            {mov.user?.name || "SYSTEM AUTO-PROCESS"}
                        </div>
                        {mov.reason && (
                            <div className="text-[10px] font-bold text-indigo-400 italic px-3 py-1 bg-indigo-500/5 rounded-lg border border-indigo-500/10 truncate max-w-[240px]">
                                "{mov.reason}"
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-10 w-full lg:w-auto mt-6 lg:mt-0 pt-6 lg:pt-0 border-t lg:border-t-0 border-border relative z-10">
                <div className="text-right">
                    <p className="text-[9px] font-black text-muted-foreground/20 uppercase tracking-[0.3em] italic mb-1">CANTIDAD VECTOR</p>
                    <div className={cn("text-2xl sm:text-3xl lg:text-4xl font-black italic font-space-grotesk tabular-nums leading-none tracking-tighter flex items-center justify-end gap-1", isEntry ? "text-emerald-500" : "text-rose-500")}>
                        <span className="text-xl mb-0.5">{isEntry ? '+' : '−'}</span>
                        {Math.abs(mov.qty)}
                        <span className="text-[10px] ml-1 text-muted-foreground/20 uppercase font-bold tracking-widest">UNIT</span>
                    </div>
                </div>
                
                <div className="w-[1px] h-12 bg-border hidden lg:block" />

                <div className="w-12 h-12 rounded-2xl bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-all cursor-crosshair">
                    <Package className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                </div>
            </div>
        </motion.div>
    );
}

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Store as StoreIcon, Settings as SettingsIcon, Trash2, MapPin, Percent, ShieldCheck, Power, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreCardProps {
  store: Record<string, unknown>;
  idx: number;
  onEdit: (s: Record<string, unknown>) => void;
  canManage: boolean;
  isActive: boolean;
  canSwitch: boolean;
  onSwitch: (id: string) => void;
  isSwitching?: boolean;
}

export default function StoreCard({ store, idx, onEdit, canManage, isActive, canSwitch, onSwitch, isSwitching = false }: StoreCardProps) {
  return (
    <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ delay: idx * 0.03 }}
        className={cn(
          "bg-muted border rounded-[3rem] p-10 glass-pro hover:bg-muted/80 transition-all group relative overflow-hidden",
          isActive 
            ? "border-primary/50 shadow-glow-pro bg-primary/5" 
            : "border-border hover:border-primary/20 hover:shadow-pro"
        )}
    >
        <div className="flex flex-col gap-8 relative z-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border",
                      isActive
                        ? "bg-primary/20 border-primary shadow-glow-pro"
                        : "bg-primary/10 border-primary/20"
                    )}>
                        <StoreIcon className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl lg:text-3xl font-black italic font-space-grotesk text-foreground tracking-tighter group-hover:text-primary transition-colors truncate pr-2">
                            {store.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              isActive ? "bg-emerald-500 animate-pulse shadow-glow-pro" : "bg-muted-foreground/30"
                            )} />
                            <span className={cn(
                              "text-[9px] font-black uppercase italic tracking-widest leading-none",
                              isActive ? "text-emerald-500" : "text-muted-foreground/50"
                            )}>
                              {isActive ? "NODO ACTIVO" : "NODO AUXILIAR"}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    {!isActive && canSwitch && (
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="w-12 h-12 rounded-2xl bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-all shadow-pro text-muted-foreground/80 hover:text-primary"
                        onClick={() => onSwitch(store.id as string)}
                        disabled={isSwitching}
                        title="Conectarse a este nodo"
                      >
                        {isSwitching ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Power className="w-5 h-5" />
                        )}
                      </Button>
                    )}
                    <Button
                        variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-muted border border-border hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                        onClick={() => onEdit(store)}
                        disabled={!canManage}
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic mb-2">LOCALIZACIÓN</p>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                            <span className="text-xs font-black italic uppercase text-muted-foreground/60 tracking-tight leading-relaxed">
                                {store.address || 'NO INDEXADA'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic mb-2">IVA (%)</p>
                        <div className="flex items-center gap-2 text-xl font-black italic font-space-grotesk text-amber-500">
                            <Percent className="w-4 h-4 text-amber-500/40" /> {store.tax_rate}%
                        </div>
                    </div>
                    <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                        <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest italic mb-2">MATRIX</p>
                        <div className="flex items-center gap-2 text-xl font-black italic font-space-grotesk text-primary">
                            <ShieldCheck className="w-4 h-4 text-primary/40" /> 2.0
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t border-border/50">
                <span className="text-[9px] font-black text-muted-foreground/40 uppercase italic tracking-widest">NODE ID:</span>
                <span className="text-[9px] font-bold text-muted-foreground/60 italic font-space-grotesk truncate">{store.id}</span>
            </div>
        </div>
    </motion.div>
  );
}

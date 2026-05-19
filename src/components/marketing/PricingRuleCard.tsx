import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Clock, Zap, Target, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { PricingRule } from "@/lib/pos-types";

interface PricingRuleCardProps {
  rule: PricingRule;
  onEdit: (rule: PricingRule) => void;
  onDelete: (id: string) => void;
  daysOfWeek: { value: number; label: string }[];
}

export default function PricingRuleCard({ rule, onEdit, onDelete, daysOfWeek }: PricingRuleCardProps) {
  return (
    <Card className={cn(
        "bg-muted border border-border rounded-[2.5rem] shadow-pro glass-pro hover:bg-muted/80 hover:border-primary/20 transition-all group relative overflow-hidden",
        !rule.active && "opacity-60 grayscale"
    )}>
        <CardHeader className="p-8 pb-4">
            <CardTitle className="flex justify-between items-center text-xl font-black italic uppercase font-space-grotesk tracking-tight text-foreground">
                <span className="truncate mr-4">{rule.name}</span>
                <div className="flex gap-2">
                    <Button 
                        variant="ghost" size="icon" 
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 hover:bg-primary/20 hover:text-primary transition-all shadow-pro"
                        onClick={() => onEdit(rule)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" size="icon" 
                        className="w-9 h-9 rounded-xl bg-white/5 border border-white/5 hover:bg-rose-500/20 hover:text-rose-500 transition-all shadow-pro"
                        onClick={() => onDelete(rule.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary italic">
                {rule.discount_type === 'percentage' ? 
                    `Ajuste de ${rule.discount_value}% en Tiempo Real` : 
                    `Ajuste de $${rule.discount_value.toLocaleString()} en Tiempo Real`}
            </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest italic mb-6 leading-relaxed">
                {rule.description || "SIN DESCRIPCIÓN TÉCNICA ASOCIADA."}
            </p>
            
            <div className="space-y-4">
                {rule.type === 'time_based' && (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                        <div className="flex items-center gap-3 text-[9px] font-black text-white/60 uppercase tracking-[0.2em] italic">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            VENTANA DE ACCIÓN: {rule.start_time?.slice(0,5)} — {rule.end_time?.slice(0,5)}
                        </div>
                        {rule.days_of_week && rule.days_of_week.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400 mr-1" />
                                {rule.days_of_week.map((d: number) => {
                                    const dayName = daysOfWeek.find(dw => dw.value === d)?.label.substring(0,3);
                                    return (
                                        <span key={d} className="bg-white/5 border border-white/10 text-white/60 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest italic">
                                            {dayName}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-[9px] uppercase tracking-widest italic",
                        rule.active 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-glow-pro" 
                            : "bg-white/5 border-white/10 text-white/40"
                    )}>
                        <Zap className="w-3 h-3" /> {rule.active ? 'SISTEMA ACTIVO' : 'REGLA OFFLINE'}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-[9px] uppercase tracking-widest italic shadow-glow-pro">
                        <Target className="w-3 h-3" /> TARGET: {rule.target_type === 'all' ? 'TODO' : rule.target_type === 'category' ? 'CAT' : 'PROD'}
                    </div>
                </div>
            </div>
        </CardContent>
    </Card>
  );
}

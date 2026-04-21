import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PreparationLog } from "@/hooks/usePreparation";

interface PreparationLogListProps {
  logs: PreparationLog[];
  loading: boolean;
  onDelete: (log: PreparationLog) => void;
}

export default function PreparationLogList({ logs, loading, onDelete }: PreparationLogListProps) {
  return (
    <Card className="glass-pro border-white/10 shadow-pro rounded-[2.5rem] overflow-hidden h-fit flex flex-col">
        <CardHeader className="bg-white/5 border-b border-white/5 py-10 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <CardTitle className="font-space-grotesk italic uppercase tracking-tighter text-xl lg:text-2xl flex items-center gap-2">
                        <History className="w-6 h-6 text-muted-foreground/40" />
                        Historial Reciente
                    </CardTitle>
                    <CardDescription className="text-white/40 font-black uppercase text-[10px] tracking-widest">
                        Últimos registros de producción verificados
                    </CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
            {loading ? (
                <div className="p-20 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4 shadow-pro" />
                    <p className="text-primary font-black animate-pulse tracking-[0.3em] uppercase text-[10px]">Data Stream Active</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="p-20 text-center">
                    <History className="w-16 h-16 text-muted-foreground/5 mx-auto mb-4" />
                    <p className="text-muted-foreground/20 font-black uppercase tracking-widest text-[10px] italic">No hay registros de producción pendientes</p>
                </div>
            ) : (
                <div className="divide-y divide-white/5">
                    {logs.map((log) => (
                        <div key={log.id} className="p-6 flex items-center justify-between hover:bg-muted/40 transition-all group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-all" />
                            <div className="space-y-1 relative z-10">
                                <p className="font-black text-xs uppercase tracking-widest text-foreground italic font-space-grotesk group-hover:text-primary transition-colors">
                                    {log.reason?.replace('Preparación Lote: ', '') || log.products?.name || "Registro General"}
                                </p>
                                <p className="text-[9px] text-muted-foreground/30 font-black uppercase tracking-widest italic">
                                    {format(new Date(log.created_at), "d MMMM, HH:mm", { locale: es })}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "font-black text-[10px] uppercase tracking-widest italic h-8 px-3 border-none shadow-pro",
                                        log.type === 'exit' 
                                            ? "appetite-accent-muted"
                                            : "bg-primary/20 text-primary"
                                    )}
                                >
                                    {log.type === 'exit' ? '-' : '+'} {(log.qty / 1000).toFixed(1)} L
                                </Badge>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => onDelete(log)}
                                    className="h-10 w-10 rounded-xl text-muted-foreground/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
    </Card>
  );
}

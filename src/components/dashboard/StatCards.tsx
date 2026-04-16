import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Tag, ArrowUpRight, ArrowDownRight, Circle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/currency";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

export function StatCards({ data, label }: { data: any, label: string }) {
  if (!data) return null;

  // Preparation of sparkline data
  const sparkData = data.hourlySales || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 perspective-1000">
      {/* Revenue Card */}
      <div className="dim-layering">
        <Card className="glass-pro rounded-[2.5rem] shadow-pro relative overflow-hidden h-full border-white/5 group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] font-space-grotesk italic">Ingresos Netos</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Sincronizado</span>
            </div>
            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground font-space-grotesk group-hover:scale-105 transition-transform origin-left duration-500 truncate">
                {formatCOP(data.metrics.revenue.val)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-dm-sans">
                <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black", data.metrics.revenue.delta >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                  {data.metrics.revenue.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(Math.round(data.metrics.revenue.delta))}%
                </div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground italic">vs {label}</span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="h-14 w-full opacity-50 group-hover:opacity-100 transition-opacity duration-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                   <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#700de7" 
                    strokeWidth={3} 
                    dot={false} 
                    animationDuration={2000}
                   />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Orders Card */}
      <div className="dim-layering">
        <Card className="glass-pro rounded-[2.5rem] shadow-pro relative overflow-hidden h-full border-white/5 group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-secondary/0 via-secondary/50 to-secondary/0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
             <div className="flex flex-col">
              <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] font-space-grotesk italic">Flujo Órdenes</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Operacional</span>
            </div>
            <div className="w-10 h-10 bg-secondary/20 rounded-2xl flex items-center justify-center border border-secondary/20 shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
              <ShoppingBag className="w-5 h-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground font-space-grotesk group-hover:scale-105 transition-transform origin-left duration-500 truncate">
                {data.metrics.orders.val}
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-dm-sans">
                 <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black", data.metrics.orders.delta >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                  {data.metrics.orders.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(data.metrics.orders.delta)}
                </div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground italic">vs {label}</span>
              </div>
            </div>

             {/* Sparkline */}
             <div className="h-14 w-full opacity-50 group-hover:opacity-100 transition-opacity duration-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                   <Line 
                    type="monotone" 
                    dataKey="items" 
                    stroke="#a855f7" 
                    strokeWidth={3} 
                    dot={false}
                    animationDuration={2500} 
                   />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Avg Ticket Card */}
      <div className="dim-layering">
        <Card className="glass-pro rounded-[2.5rem] shadow-pro relative overflow-hidden h-full border-white/5 group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-accent/0 via-accent/50 to-accent/0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] font-space-grotesk italic">Valor Promedio</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Eficiencia</span>
            </div>
            <div className="w-10 h-10 bg-accent/20 rounded-2xl flex items-center justify-center border border-accent/20 shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
              <Tag className="w-5 h-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground font-space-grotesk group-hover:scale-105 transition-transform origin-left duration-500 truncate">
                {formatCOP(data.metrics.avgTicket.val)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-dm-sans">
                <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black", data.metrics.avgTicket.delta >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                  {data.metrics.avgTicket.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(Math.round(data.metrics.avgTicket.delta))}%
                </div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground italic">vs {label}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <TrendingUp className="w-3 h-3 text-accent" />
                <span className="text-[8px] font-black uppercase text-accent/80 tracking-widest">Tendencia al alza detectada</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cancelled Card */}
      <div className="dim-layering">
        <Card className="glass-pro rounded-[2.5rem] shadow-pro relative overflow-hidden h-full border-white/5 group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] font-space-grotesk italic">Fugas Riesgo</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Crítico</span>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
              <Circle className="w-5 h-5 text-red-400 fill-red-400/20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground font-space-grotesk group-hover:scale-105 transition-transform origin-left duration-500 truncate">
              {data.metrics.cancelled.val}
            </div>
            <div className="mt-4 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
               <div className="flex items-center justify-between mb-1">
                 <span className="text-[8px] font-black text-red-400/60 uppercase tracking-widest">Impacto Financiero</span>
                 <span className="text-[8px] font-bold text-red-400">-{Math.round((data.metrics.cancelled.val / (data.metrics.orders.val || 1)) * 100)}%</span>
               </div>
               <div className="w-full bg-red-500/10 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-red-500 h-full shadow-glow-pro" 
                    style={{ width: `${Math.min((data.metrics.cancelled.val / (data.metrics.orders.val || 1)) * 100, 100)}%` }} 
                  />
               </div>
               <p className="text-[9px] font-bold text-red-500 mt-2 italic leading-none uppercase tracking-tighter">
                 -{formatCOP(data.metrics.cancelled.val * (data.metrics.avgTicket.val || 10000))} En riesgo
               </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

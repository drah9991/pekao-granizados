import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DollarSign, ShoppingBag, ArrowUpRight, ArrowDownRight, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/currency";
import { ResponsiveContainer, LineChart, Line, YAxis } from "recharts";

export function StatCards({ data, label }: { data: any, label: string }) {
  if (!data) return null;

  const sparkData = data.hourlySales || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 perspective-1000">
      {/* Revenue Card */}
      <div className="dim-layering">
        <Card className="glass-pro rounded-[2.5rem] shadow-pro relative overflow-hidden h-full border-white/5 group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] font-space-grotesk italic">Ingresos Brutos</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Recaudación Real</span>
            </div>
            <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20 shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
              <DollarSign className="w-5 h-5 text-emerald-400" />
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

            <div className="h-14 w-full opacity-50 group-hover:opacity-100 transition-opacity duration-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                   <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
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
      
      {/* Expenses Card */}
      <div className="dim-layering">
        <Card className="glass-pro rounded-[2.5rem] shadow-pro relative overflow-hidden h-full border-white/5 group">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
             <div className="flex flex-col">
              <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] font-space-grotesk italic">Egresos Totales</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Gastos Operativos</span>
            </div>
            <div className="w-10 h-10 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-glow-pro group-hover:scale-110 transition-transform duration-500">
              <ArrowDownRight className="w-5 h-5 text-red-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground font-space-grotesk group-hover:scale-105 transition-transform origin-left duration-500 truncate">
                {formatCOP(data.metrics.expenses.val)}
              </div>
              <div className="flex items-center gap-2 pt-2">
                 <div className="w-full bg-red-500/10 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full shadow-glow-pro transition-all duration-1000" 
                      style={{ width: `${Math.min((data.metrics.expenses.val / (data.metrics.revenue.val || 1)) * 100, 100)}%` }} 
                    />
                 </div>
              </div>
              <p className="text-[9px] font-bold text-muted-foreground mt-2 uppercase tracking-tighter italic">
                Representa el {Math.round((data.metrics.expenses.val / (data.metrics.revenue.val || 1)) * 100)}% de los ingresos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Profit Card */}
      <div className="dim-layering">
        <Card className="glass-pro rounded-[2.5rem] shadow-pro relative overflow-hidden h-full border-white/5 group bg-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] font-space-grotesk italic">Utilidad Neta</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Margen Real</span>
            </div>
            <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20 shadow-glow-pro group-hover:rotate-12 transition-transform duration-500">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tighter text-foreground font-space-grotesk group-hover:scale-105 transition-transform origin-left duration-500 truncate text-glow-primary">
                {formatCOP(data.metrics.netProfit.val)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 font-dm-sans">
                <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", data.metrics.netProfit.val >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                  {data.metrics.netProfit.val >= 0 ? "FLUJO POSITIVO" : "DEFICIT DETECTADO"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <Activity className="w-3 h-3 text-primary animate-pulse" />
                <span className="text-[8px] font-black uppercase text-primary/80 tracking-widest">Salud Financiera Estable</span>
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
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Volumen Transaccional</span>
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
    </div>
  );
}

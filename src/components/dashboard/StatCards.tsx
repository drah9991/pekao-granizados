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
      <div className="animate-pro-in">
        <Card className="bg-white/[0.02] border-white/5 rounded-3xl shadow-pro relative overflow-hidden h-full group transition-all duration-500 hover:bg-white/[0.04]">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest font-dm-sans">Ingresos Brutos</span>
              <span className="text-[8px] font-medium text-muted-foreground/40 uppercase tracking-widest mt-1">Recaudación Total</span>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-extrabold tracking-tight text-foreground font-dm-sans">
                {formatCOP(data.metrics.revenue.val)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold", data.metrics.revenue.delta >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                  {data.metrics.revenue.delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(Math.round(data.metrics.revenue.delta))}%
                </div>
                <span className="text-[9px] font-medium text-muted-foreground/40">vs {label}</span>
              </div>
            </div>

            <div className="h-14 w-full opacity-30 group-hover:opacity-60 transition-opacity duration-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                   <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={2} 
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
      <div className="animate-pro-in delay-75">
        <Card className="bg-white/[0.02] border-white/5 rounded-3xl shadow-pro relative overflow-hidden h-full group transition-all duration-500 hover:bg-white/[0.04]">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-rose-500/30 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
             <div className="flex flex-col">
              <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest font-dm-sans">Egresos Totales</span>
              <span className="text-[8px] font-medium text-muted-foreground/40 uppercase tracking-widest mt-1">Costos Operativos</span>
            </div>
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-rose-500/20">
              <ArrowDownRight className="w-5 h-5 text-rose-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-extrabold tracking-tight text-foreground font-dm-sans">
                {formatCOP(data.metrics.expenses.val)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full shadow-glow transition-all duration-1000" 
                      style={{ width: `${Math.min((data.metrics.expenses.val / (data.metrics.revenue.val || 1)) * 100, 100)}%` }} 
                    />
                 </div>
              </div>
              <p className="text-[9px] font-medium text-muted-foreground/30 mt-3 uppercase tracking-wider">
                {Math.round((data.metrics.expenses.val / (data.metrics.revenue.val || 1)) * 100)}% de los ingresos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Profit Card */}
      <div className="animate-pro-in delay-150">
        <Card className="bg-primary/5 border-primary/20 rounded-3xl shadow-pro relative overflow-hidden h-full group transition-all duration-500 hover:bg-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest font-dm-sans">Utilidad Neta</span>
              <span className="text-[8px] font-medium text-muted-foreground/40 uppercase tracking-widest mt-1">Margen Final</span>
            </div>
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/20 transition-all duration-500 group-hover:rotate-12">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-extrabold tracking-tight text-foreground font-dm-sans text-glow-primary">
                {formatCOP(data.metrics.netProfit.val)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wider", data.metrics.netProfit.val >= 0 ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-400")}>
                  {data.metrics.netProfit.val >= 0 ? "FLUJO ÓPTIMO" : "DÉFICIT DETECTADO"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <Activity className="w-3.5 h-3.5 text-primary/60 animate-pulse" />
                <span className="text-[8px] font-bold uppercase text-primary/60 tracking-widest">Salud Operativa Estable</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Card */}
      <div className="animate-pro-in delay-200">
        <Card className="bg-white/[0.02] border-white/5 rounded-3xl shadow-pro relative overflow-hidden h-full group transition-all duration-500 hover:bg-white/[0.04]">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-indigo-400/80 uppercase tracking-widest font-dm-sans">Flujo Órdenes</span>
              <span className="text-[8px] font-medium text-muted-foreground/40 uppercase tracking-widest mt-1">Volumen Operativo</span>
            </div>
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-indigo-500/20">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-3xl font-extrabold tracking-tight text-foreground font-dm-sans">
                {data.metrics.orders.val}
              </div>
              <div className="flex items-center gap-2 mt-2">
                 <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] font-bold", data.metrics.orders.delta >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                  {data.metrics.orders.delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {Math.abs(data.metrics.orders.delta)}
                </div>
                <span className="text-[9px] font-medium text-muted-foreground/40">vs {label}</span>
              </div>
            </div>

             <div className="h-14 w-full opacity-30 group-hover:opacity-60 transition-opacity duration-700">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData}>
                   <Line 
                    type="monotone" 
                    dataKey="items" 
                    stroke="#6366f1" 
                    strokeWidth={2} 
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

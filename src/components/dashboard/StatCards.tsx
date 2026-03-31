import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Tag, ArrowUpRight, ArrowDownRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCOP } from "@/lib/currency";

export function StatCards({ data, label }: { data: any, label: string }) {
  if (!data) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Revenue */}
      <Card className="glass-card rounded-[2.5rem] shadow-elevated relative overflow-hidden group hover:-translate-y-1 transition-smooth">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ingresos Totales</span>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-[1rem] flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black mb-2 tracking-tighter text-white">{formatCOP(data.metrics.revenue.val)}</div>
          <div className="flex items-center gap-1.5">
            <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black", data.metrics.revenue.delta >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
              {data.metrics.revenue.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(Math.round(data.metrics.revenue.delta))}%
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500">vs {label}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Orders */}
      <Card className="glass-card rounded-[2.5rem] shadow-elevated relative overflow-hidden group hover:-translate-y-1 transition-smooth">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Órdenes</span>
          <div className="w-10 h-10 bg-indigo-500/10 rounded-[1rem] flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-indigo-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black mb-2 tracking-tighter text-white">{data.metrics.orders.val}</div>
          <div className="flex items-center gap-1.5">
             <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black", data.metrics.orders.delta >= 0 ? "bg-indigo-500/10 text-indigo-500" : "bg-red-500/10 text-red-500")}>
              {data.metrics.orders.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(data.metrics.orders.delta)}
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500">vs {label}</span>
          </div>
        </CardContent>
      </Card>

      {/* Avg Ticket */}
      <Card className="glass-card rounded-[2.5rem] shadow-elevated relative overflow-hidden group hover:-translate-y-1 transition-smooth">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-teal-500/0 via-teal-500/40 to-teal-500/0" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ticket Promedio</span>
          <div className="w-10 h-10 bg-teal-500/10 rounded-[1rem] flex items-center justify-center">
            <Tag className="w-5 h-5 text-teal-500" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black mb-2 tracking-tighter text-white">{formatCOP(data.metrics.avgTicket.val)}</div>
          <div className="flex items-center gap-1.5">
            <div className={cn("flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black", data.metrics.avgTicket.delta >= 0 ? "bg-teal-500/10 text-teal-500" : "bg-red-500/10 text-red-500")}>
              {data.metrics.avgTicket.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(Math.round(data.metrics.avgTicket.delta))}%
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500">vs {label}</span>
          </div>
        </CardContent>
      </Card>

      {/* Cancelled */}
      <Card className="glass-card rounded-[2.5rem] shadow-elevated relative overflow-hidden group hover:-translate-y-1 transition-smooth">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0" />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cancelaciones</span>
          <div className="w-10 h-10 bg-red-500/10 rounded-[1rem] flex items-center justify-center">
            <Circle className="w-5 h-5 text-red-500 fill-red-500/20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black mb-2 tracking-tighter text-white">{data.metrics.cancelled.val}</div>
          <div className="flex items-center gap-2">
             <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
               Perdida {formatCOP(data.metrics.cancelled.val * (data.metrics.avgTicket.val || 10000))} aprox.
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

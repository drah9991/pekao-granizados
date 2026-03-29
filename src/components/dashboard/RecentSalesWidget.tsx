import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

export function RecentSalesWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="lg:col-span-3 glass-card border-none rounded-[3.5rem] p-10 shadow-elevated border-t border-white/5 overflow-hidden hover:-translate-y-1 transition-smooth">
      <div className="flex items-center justify-between mb-10">
        <div>
          <CardTitle className="text-2xl font-black tracking-tight mb-1 text-white">Últimas Ventas</CardTitle>
          <CardDescription className="text-slate-400 font-medium tracking-wide">Registro cronológico</CardDescription>
        </div>
        <Button variant="ghost" className="text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/20 rounded-xl px-6 transition-all">Ver Historial</Button>
      </div>
      <div className="overflow-x-auto -mx-10 px-10">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
              <th className="pb-6">ID Pedido</th><th className="pb-6">Hora</th><th className="pb-6 text-center">Ítems</th><th className="pb-6">Método</th><th className="pb-6">Estado</th><th className="pb-6 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {data.recentOrders.map((order: any) => (
              <tr key={order.id} className="group hover:bg-white/[0.04] transition-colors cursor-pointer">
                <td className="py-6 text-xs font-black text-slate-400 group-hover:text-white transition-colors">#{order.id.slice(0, 8)}</td>
                <td className="py-6 text-xs font-bold text-slate-300">{format(new Date(order.created_at), 'HH:mm')}</td>
                <td className="py-6 text-xs font-black text-slate-300 text-center">
                  <Badge variant="outline" className="border-white/10 text-[10px] rounded-lg group-hover:border-white/30 transition-colors">{order.order_items.reduce((sum: number, i: any) => sum + i.qty, 0)}</Badge>
                </td>
                <td className="py-6">
                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-tighter bg-white/5 px-2 py-1 rounded-md">{order.payment?.method === 'cash' ? 'Efectivo' : (order.payment?.method === 'card' ? 'Tarjeta' : (order.payment?.method === 'transfer' ? 'Nequi' : 'Efectivo'))}</span>
                </td>
                <td className="py-6">
                  <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight", order.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.15)]" : "bg-red-500/10 text-red-500")}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", order.status === 'completed' ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                    {order.status === 'completed' ? 'Completado' : 'Cancelado'}
                  </div>
                </td>
                <td className={cn("py-6 text-right font-black text-lg tabular-nums", order.status === 'cancelled' ? "text-slate-600 line-through" : "text-white")}>{formatMoney(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

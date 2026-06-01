import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { formatCOP } from "@/lib/currency";

interface RecentOrder {
  id: string;
  created_at: string;
  total: number;
  status: string;
  payment?: { method?: string };
  order_items: Array<{ qty: number }>;
}

interface RecentSalesData {
  recentOrders: RecentOrder[];
}

export function RecentSalesWidget({ data }: { data: RecentSalesData | null }) {
  if (!data) return null;
  return (
    <Card className="h-full w-full flex flex-col glass-pro border-border dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm dark:shadow-pro overflow-hidden animate-pro-in hover:bg-muted/30 dark:hover:bg-white/[0.04] transition-all duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <CardTitle className="text-2xl font-black tracking-tighter mb-1 text-foreground font-space-grotesk italic">ÚLTIMAS VENTAS</CardTitle>
          <CardDescription className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">Real-time auditing</CardDescription>
        </div>
        <Button variant="ghost" className="text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/20 rounded-xl px-6 transition-all font-space-grotesk">Ver Historial</Button>
      </div>
      <div className="table-container-pro">
        <table className="w-full text-left">
          <thead className="sticky-header-pro">
            <tr className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
              <th className="py-4 font-space-grotesk whitespace-nowrap">ID Pedido</th>
              <th className="py-4 font-space-grotesk whitespace-nowrap">Hora</th>
              <th className="py-4 text-center font-space-grotesk whitespace-nowrap">Ítems</th>
              <th className="py-4 font-space-grotesk whitespace-nowrap">Método</th>
              <th className="py-4 font-space-grotesk whitespace-nowrap">Estado</th>
              <th className="py-4 text-right font-space-grotesk whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 dark:divide-white/[0.03]">
            {data.recentOrders.map((order) => (
              <tr key={order.id} className="group hover:bg-muted/30 dark:hover:bg-white/[0.05] transition-all duration-300 cursor-pointer">
                <td className="py-5 text-xs font-black text-muted-foreground group-hover:text-primary transition-colors font-space-grotesk tracking-widest italic">#{order.id.slice(0, 8)}</td>
                <td className="py-5 text-xs font-bold text-foreground/80 dark:text-foreground/70 font-dm-sans">{format(new Date(order.created_at), 'HH:mm')}</td>
                <td className="py-5 text-xs font-black text-foreground text-center">
                  <Badge variant="outline" className="border-border/50 text-[10px] rounded-lg group-hover:border-primary/50 transition-colors font-space-grotesk">{order.order_items.reduce((sum: number, i) => sum + i.qty, 0)}</Badge>
                </td>
                <td className="py-5">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest bg-muted/50 px-2 py-1 rounded-md border border-border/50 group-hover:border-primary/30 group-hover:text-primary transition-all">{order.payment?.method === 'cash' ? 'Efectivo' : (order.payment?.method === 'card' ? 'Tarjeta' : (order.payment?.method === 'transfer' ? 'Nequi' : 'Efectivo'))}</span>
                </td>
                <td className="py-5">
                  <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight", order.status === 'completed' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-glow-pro" : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20")}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", order.status === 'completed' ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
                    {order.status === 'completed' ? 'Success' : 'Voided'}
                  </div>
                </td>
                <td className={cn("py-5 text-right font-black text-lg tabular-nums font-space-grotesk", order.status === 'cancelled' ? "text-muted-foreground line-through opacity-50" : "text-foreground")}>{formatCOP(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

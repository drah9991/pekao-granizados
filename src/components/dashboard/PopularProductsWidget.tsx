import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";

import { formatCOP } from "@/lib/currency";

const getEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("fresa")) return "🍓";
  if (n.includes("sandía") || n.includes("sandia")) return "🍉";
  if (n.includes("mango")) return "🥭";
  if (n.includes("uva")) return "🍇";
  return "🥤";
};

export function PopularProductsWidget({ data }: { data: any }) {
  if (!data) return null;
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2 glass-pro border-border dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm dark:shadow-pro group animate-pro-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <CardTitle className="text-2xl font-black tracking-tight mb-1 text-foreground font-space-grotesk italic">TOP VENTAS</CardTitle>
          <CardDescription className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">Product Intelligence</CardDescription>
        </div>
        <div className="p-3 bg-primary/20 rounded-2xl border border-primary/20">
            <ShoppingBasket className="w-6 h-6 text-primary" />
        </div>
      </div>
      <div className="space-y-4">
        {data.popularProducts.map((p: any, idx: number) => (
          <div key={p.name} className="flex items-center gap-5 p-3 rounded-3xl hover:bg-muted/50 dark:hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-border dark:hover:border-white/5 group/item">
            <div className="relative shrink-0">
              <span className="absolute -top-2 -left-2 w-7 h-7 bg-primary rounded-xl flex items-center justify-center text-[10px] font-black border border-white/20 z-10 shadow-glow-pro text-primary-foreground italic">#{idx + 1}</span>
              <div className="text-4xl bg-slate-100 dark:bg-muted/50 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-slate-200 dark:border-border/50 transition-all group-hover/item:scale-110 group-hover/item:-rotate-3 duration-500 shadow-sm dark:shadow-pro">{getEmoji(p.name)}</div>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground font-space-grotesk truncate pr-2 uppercase">{p.name}</p>
                  <p className="text-[9px] font-black text-muted-foreground tracking-[0.2em] uppercase leading-none mt-1">Suministro Estable</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-foreground font-space-grotesk">{p.sales} <span className="text-[9px] text-muted-foreground uppercase not-italic">und</span></p>
                  <p className="text-[9px] font-black text-primary tracking-tighter shadow-glow-pro-text">{formatCOP(p.revenue)}</p>
                </div>
              </div>
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                 <div className={cn("h-full rounded-full transition-all duration-1000", idx === 0 ? "bg-primary shadow-glow-pro" : "bg-primary/40")} style={{ width: `${(p.sales / data.popularProducts[0].sales) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}

        {data.lowStock && data.lowStock.length > 0 && (
           <div className="mt-8 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-4 animate-pro-in shadow-sm">
              <div className="w-12 h-12 bg-rose-500/20 rounded-xl flex items-center justify-center shrink-0 border border-rose-500/30">
                 <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-red-400 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black text-rose-900 dark:text-white font-space-grotesk uppercase tracking-wider leading-none mb-1">Stock Bajo Crítico</p>
                <p className="text-[10px] font-bold text-rose-600 dark:text-red-400 uppercase tracking-tighter italic">{data.lowStock[0].name}: {data.lowStock[0].stock} unidades restantes</p>
              </div>
           </div>
        )}

        {data.popularProducts.length === 0 && (
          <div className="py-20 text-center opacity-20 border-2 border-dashed border-white/5 rounded-3xl">
             <ShoppingBasket className="w-16 h-16 mx-auto mb-4" />
             <p className="text-xs font-black uppercase tracking-widest">Sincronizando catálogo...</p>
          </div>
        )}
      </div>
    </Card>
  );
}

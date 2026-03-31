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
    <Card className="lg:col-span-2 glass-card border-none rounded-[3.5rem] p-10 shadow-elevated border-t border-white/5 hover:-translate-y-1 transition-smooth">
      <div className="flex items-center justify-between mb-10">
        <div>
          <CardTitle className="text-2xl font-black tracking-tight mb-1 text-white">Top Ventas</CardTitle>
          <CardDescription className="text-slate-400 font-medium tracking-wide">Preferencias</CardDescription>
        </div>
      </div>
      <div className="space-y-8">
        {data.popularProducts.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center gap-5 group">
            <div className="relative">
              <span className="absolute -top-2 -left-2 w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black border border-white/10 z-10 shadow-lg">{idx + 1}</span>
              <div className="text-4xl bg-white/5 w-16 h-16 rounded-[1.5rem] flex items-center justify-center border border-white/5 transition-transform group-hover:scale-110 duration-500">{getEmoji(p.name)}</div>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black truncate max-w-[120px] text-slate-200">{p.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 tracking-[0.1em] uppercase group-hover:text-primary transition-colors">Best Seller</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-white">{p.sales} und</p>
                  <p className="text-[10px] font-bold text-emerald-500">{formatCOP(p.revenue)}</p>
                </div>
              </div>
              <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden p-[1px]">
                 <div className={cn("h-full rounded-full transition-all duration-1000", idx === 0 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : (idx === 1 ? "bg-cyan-500" : "bg-teal-500"))} style={{ width: `${(p.sales / data.popularProducts[0].sales) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
        {data.lowStock && data.lowStock.length > 0 && (
           <div className="mt-12 p-6 bg-orange-500/10 border border-orange-500/20 rounded-[2.5rem] flex items-center gap-4 animate-bounce-subtle">
              <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center shrink-0">
                 <AlertTriangle className="w-6 h-6 text-orange-500 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Stock bajo crítico</p>
                <p className="text-xs font-bold text-orange-500 uppercase tracking-tighter">{data.lowStock[0].name}: {data.lowStock[0].stock} und</p>
              </div>
           </div>
        )}
        {data.popularProducts.length === 0 && (
          <div className="py-20 text-center opacity-30">
             <ShoppingBasket className="w-16 h-16 mx-auto mb-4" />
             <p className="text-sm font-bold text-slate-300">Sin datos</p>
          </div>
        )}
      </div>
    </Card>
  );
}

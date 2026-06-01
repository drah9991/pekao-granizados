import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Beaker, AlertCircle, Droplets, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Mixture {
  name: string;
  stock: number;
  min_stock: number;
  is_mixture?: boolean;
}

interface MixtureStockWidgetProps {
  data: {
    lowStock: Array<{ id: string; name: string; stock: number; min_stock: number; is_mixture?: boolean }>;
    sizes?: Array<{ id: string; name: string; multiplier: number }>;
  } | null;
}

const OZ_TO_ML = 29.57;
const STANDARD_SERVING_OZ = 4;
const STANDARD_SERVING_ML = STANDARD_SERVING_OZ * OZ_TO_ML;

export function MixtureStockWidget({ data }: MixtureStockWidgetProps) {
  // If no data or empty mixtures, don't show much
  const mixtures = data?.lowStock?.filter((m) => m.is_mixture) || [];
  
  // NOTE: If the flag is_mixture is new, we might need a better way to filter.
  // For now, let's assume the dashboard query is updated to include it.
  
  if (!data || !data.lowStock) return null;

  // Let's manually filter based on what we have in the dashboardData.lowStock if it's already there
  // Actually, I'll update Dashboard.tsx query first.
  
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2 glass-pro border-border dark:border-white/5 rounded-[2.5rem] shadow-sm dark:shadow-pro overflow-hidden relative group animate-pro-in">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
      
      <CardHeader className="pb-4 border-b border-border/50 bg-slate-50/50 dark:bg-muted/30 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl text-primary border border-primary/20 shadow-glow-pro transition-transform group-hover:rotate-6">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tighter text-foreground font-space-grotesk italic">STOCK DE MEZCLAS</CardTitle>
              <CardDescription className="text-primary font-black uppercase tracking-[0.2em] text-[10px]">Supply Intelligence</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/20 text-primary font-black bg-primary/5 font-space-grotesk">
            BASE: {STANDARD_SERVING_OZ}oz
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {data.lowStock.length === 0 ? (
          <div className="py-20 text-center space-y-4 opacity-30 border-2 border-dashed border-white/5 rounded-3xl">
             <Beaker className="w-16 h-16 mx-auto mb-2 text-primary" />
             <p className="text-xs font-black uppercase tracking-widest">Sistemas en nivel óptimo</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.lowStock.map((item, idx: number) => {
              const liters = item.stock / 1000;
              const servings = Math.floor(item.stock / STANDARD_SERVING_ML);
              const isLow = item.stock <= (item.min_stock || 0);
              const percentage = Math.min(100, (item.stock / (item.min_stock * 3 || 5000)) * 100);
              
              const availableSizes = data?.sizes || [];

              return (
                <div key={item.id || item.name} className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all dark:hover:bg-white/[0.08] group/item relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/item:opacity-20 transition-opacity">
                      <Beaker className="w-12 h-12 text-primary" />
                   </div>
                   
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                       <div className={cn("w-3 h-3 rounded-full shadow-glow-pro", isLow ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                       <h4 className="font-black text-foreground uppercase text-sm tracking-[0.1em] font-space-grotesk italic">{item.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-2xl font-black font-space-grotesk tracking-tighter", isLow ? "text-rose-600 dark:text-red-400" : "text-foreground dark:text-white")}>
                        {liters.toFixed(1)}<span className="text-[10px] b-not-italic ml-1 opacity-40 uppercase tracking-widest font-black">Litros</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 relative z-10">
                    <div className="h-2.5 w-full bg-slate-200 dark:bg-black/20 rounded-full overflow-hidden p-[2px]">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-1000", isLow ? 'bg-rose-500' : 'bg-primary')}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground italic">
                      <span>Nivel Crítico: {(item.min_stock / 1000).toFixed(1)}L</span>
                      <span>{Math.round(percentage)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 relative z-10">
                    <div className="flex flex-wrap gap-2">
                       <div className="px-3 py-1.5 bg-primary/10 rounded-xl border border-primary/20 flex items-center gap-2">
                          <ShoppingBag className="w-3 h-3 text-primary" />
                          <span className="text-[10px] font-black text-primary font-space-grotesk">{servings} <span className="opacity-60">PORCIONES</span> ({STANDARD_SERVING_OZ}oz)</span>
                       </div>
                      {availableSizes.slice(0, 2).map((size, sIdx: number) => {
                        if (size.multiplier === 1) return null;
                        const sizeServings = Math.floor(item.stock / (STANDARD_SERVING_ML * size.multiplier));
                        return (
                          <div key={sIdx} className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 flex items-center gap-2">
                            <span className="text-[10px] font-black text-muted-foreground font-space-grotesk">{sizeServings} <span className="opacity-60">{size.name}</span></span>
                          </div>
                        );
                      })}
                    </div>
                    {isLow && (
                       <div className="flex items-center gap-2 p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-[10px] text-rose-600 dark:text-red-400 font-black uppercase font-space-grotesk italic tracking-[0.1em] animate-pulse">
                          <AlertCircle className="w-4 h-4" />
                          REPOSICIÓN PRIORITARIA REQUERIDA
                       </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

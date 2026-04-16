import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Beaker, AlertCircle, Droplets } from "lucide-react";
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
    mixtures: Mixture[];
  } | any;
}

const OZ_TO_ML = 29.57;
const STANDARD_SERVING_OZ = 4;
const STANDARD_SERVING_ML = STANDARD_SERVING_OZ * OZ_TO_ML;

export function MixtureStockWidget({ data }: MixtureStockWidgetProps) {
  // If no data or empty mixtures, don't show much
  const mixtures = data?.lowStock?.filter((m: any) => m.is_mixture) || [];
  
  // NOTE: If the flag is_mixture is new, we might need a better way to filter.
  // For now, let's assume the dashboard query is updated to include it.
  
  if (!data || !data.lowStock) return null;

  // Let's manually filter based on what we have in the dashboardData.lowStock if it's already there
  // Actually, I'll update Dashboard.tsx query first.
  
  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2 glass-pro border-white/5 rounded-[2.5rem] shadow-pro overflow-hidden relative group animate-pro-in">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
      
      <CardHeader className="pb-4 border-b border-border/50 bg-muted/30 backdrop-blur-md">
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
            {data.lowStock.map((item: any, idx: number) => {
              const liters = item.stock / 1000;
              const servings = Math.floor(item.stock / STANDARD_SERVING_ML);
              const isLow = item.stock <= (item.min_stock || 0);
              const percentage = Math.min(100, (item.stock / (item.min_stock * 3 || 5000)) * 100);
              
              const availableSizes = data?.sizes || [];

              return (
                <div key={idx} className="space-y-3 p-5 rounded-2xl bg-muted/50 border border-border/50 hover:border-primary/30 transition-all hover:bg-muted group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className={cn("w-2 h-2 rounded-full", isLow ? "bg-red-500 shadow-glow animate-pulse" : "bg-primary shadow-glow-pro")} />
                       <h4 className="font-black text-foreground uppercase text-xs tracking-wider font-space-grotesk">{item.name}</h4>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xl font-black font-space-grotesk italic", isLow ? "text-red-400" : "text-primary")}>{liters.toFixed(1)}<span className="text-[10px] b-not-italic ml-0.5 opacity-80 text-foreground">L</span></p>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all duration-1000", isLow ? 'bg-red-500 shadow-glow' : 'bg-primary shadow-glow-pro')} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-muted text-foreground border-none font-black text-[9px] font-space-grotesk uppercase tracking-tighter">
                        {servings} x {STANDARD_SERVING_OZ}oz
                      </Badge>
                      {availableSizes.map((size: any, sIdx: number) => {
                        if (size.multiplier === 1) return null;
                        const sizeServings = Math.floor(item.stock / (STANDARD_SERVING_ML * size.multiplier));
                        return (
                          <Badge key={sIdx} variant="outline" className="border-border text-foreground font-bold text-[9px] font-dm-sans">
                            {sizeServings} x {size.name}
                          </Badge>
                        );
                      })}
                    </div>
                    {isLow && (
                       <div className="flex items-center gap-1.5 text-[9px] text-red-400 font-black uppercase pt-1 font-space-grotesk italic tracking-widest animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          ALERTA: REPONER SUMINISTRO
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

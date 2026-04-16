import { Card, CardContent } from "@/components/ui/card";
import { Package, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface ProductStatsProps {
  total: number;
  active: number;
  inactive: number;
  avgPrice: number;
}

export default function ProductStats({ total, active, inactive, avgPrice }: ProductStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pro-in">
      <Card className="glass-pro shadow-pro border-white/5 hover:bg-white/10 transition-all group overflow-hidden dim-layering rounded-[2rem]">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic">CPT • TOTAL</p>
              <div className="flex items-center gap-2">
                <span className="text-5xl font-black font-space-grotesk italic text-white tracking-tighter">{total}</span>
              </div>
            </div>
            <div className="p-4 bg-primary/20 rounded-3xl text-primary shadow-glow-pro group-hover:rotate-12 group-hover:scale-110 transition-all duration-700">
              <Package className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-pro shadow-pro border-white/5 hover:bg-white/10 transition-all group overflow-hidden dim-layering rounded-[2rem]">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/60 font-space-grotesk italic">STA • ACTIVO</p>
              <p className="text-5xl font-black font-space-grotesk italic text-emerald-400 tracking-tighter">{active}</p>
            </div>
            <div className="p-4 bg-emerald-500/20 rounded-3xl text-emerald-400 shadow-glow-pro group-hover:rotate-12 group-hover:scale-110 transition-all duration-700">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-pro shadow-pro border-white/5 hover:bg-white/10 transition-all group overflow-hidden dim-layering rounded-[2rem]">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500/60 font-space-grotesk italic">STA • INACTIVO</p>
              <p className="text-5xl font-black font-space-grotesk italic text-red-500 tracking-tighter">{inactive}</p>
            </div>
            <div className="p-4 bg-red-500/20 rounded-3xl text-red-500 shadow-glow-pro group-hover:-rotate-12 group-hover:scale-110 transition-all duration-700">
              <TrendingDown className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-pro shadow-pro border-white/5 hover:bg-white/10 transition-all group overflow-hidden dim-layering rounded-[2rem]">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 font-space-grotesk italic">VAL • ESTIMADO</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black font-space-grotesk italic text-white tracking-tighter">{formatCOP(avgPrice).replace("$", "")}</span>
                <span className="text-[10px] font-black text-primary/40 mb-1">COP</span>
              </div>
            </div>
            <div className="p-4 bg-primary/20 rounded-3xl text-primary shadow-glow-pro group-hover:rotate-12 group-hover:scale-110 transition-all duration-700">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
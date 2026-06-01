import React from "react";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";

interface YieldProjectionProps {
  liters: string;
  selectedFlavor: Record<string, unknown>;
  sizes: Record<string, unknown>[];
}

export default function YieldProjection({ liters, selectedFlavor, sizes }: YieldProjectionProps) {
  const litersNum = parseFloat(liters) || 0;
  
  return (
    <div className="p-8 bg-primary/5 rounded-[2.5rem] border border-primary/20 space-y-6 animate-pro-in relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Scale className="w-20 h-20 text-primary" />
        </div>
        <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-primary" />
                <span className="font-black uppercase tracking-[0.3em] text-[10px] text-primary italic">Intelligence Yield Projection</span>
            </div>
            <Badge className="bg-primary text-white border-none font-black uppercase tracking-widest text-[9px] h-6 px-3 shadow-glow-pro italic">
                {selectedFlavor?.base_volume ? `${selectedFlavor.base_volume}${selectedFlavor.unit_measure}` : '4OZ BASE'}
            </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest italic">Lote</span>
                <p className="text-2xl font-black font-space-grotesk italic text-foreground">{liters}L</p>
            </div>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] uppercase font-black text-muted-foreground/40 tracking-widest italic">ml Eq.</span>
                <p className="text-2xl font-black font-space-grotesk italic text-foreground">{(litersNum * 1000).toLocaleString()}</p>
            </div>
        </div>

        <div className="p-6 bg-muted/60 rounded-[2rem] border border-border space-y-4 relative z-10">
            <p className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest text-center italic">PRODUCCIÓN ESTIMADA POR TAMAÑO</p>
            <div className="grid grid-cols-1 gap-3">
                {sizes.length > 0 ? (
                    sizes.map(size => {
                        const baseVol = selectedFlavor?.base_volume || 4;
                        const unitFactor = selectedFlavor?.unit_measure === 'ml' ? 1 : 29.57;
                        const volumePerCupMl = baseVol * unitFactor * size.multiplier;
                        const qty = Math.floor((litersNum * 1000) / volumePerCupMl);
                        
                        return (
                            <div key={size.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border group hover:border-primary/50 transition-all dim-layering">
                                <div className="flex items-center gap-3">
                                    <span className="font-black text-white text-xs uppercase tracking-wider italic font-space-grotesk">{size.name}</span>
                                    <Badge variant="outline" className="text-[8px] h-4 px-1.5 opacity-30 border-border text-foreground font-black">{size.multiplier.toFixed(1)}x</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-primary text-2xl font-space-grotesk italic">{qty}</span>
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest italic">VASOS</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-dashed border-primary/20 text-center">
                        <p className="text-[9px] text-primary font-black uppercase tracking-widest italic">Configurar tamaños en Ajustes</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}

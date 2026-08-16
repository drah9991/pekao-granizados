import { Laptop, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ThemeStyles } from "./themeStyles";

interface ThemePreviewCardProps {
  activeStyles: ThemeStyles;
  commercialName: string;
}

export function ThemePreviewCard({ activeStyles, commercialName }: ThemePreviewCardProps) {
  return (
    <Card className="lg:col-span-4 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between overflow-hidden relative">
      <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
        <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
          <Laptop className="w-4 h-4 text-primary" />
          Vista Previa del Tema
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col items-center justify-center gap-4">

        {/* Smartphone Frame */}
        <div
          className="w-full max-w-[240px] h-72 rounded-[2rem] border-4 border-slate-800 shadow-[0_0_25px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative transition-all duration-300"
          style={{ backgroundColor: activeStyles.bg }}
        >
          {activeStyles.style === "classic" && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.10] mix-blend-overlay z-0"
                 style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/black-paper.png')` }}></div>
          )}

          {/* Speaker/Camera notch */}
          <div className="w-24 h-4 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl z-20" />

          {/* Simulated Content */}
          <div className={cn("p-4 pt-6 space-y-4 flex-1 flex flex-col justify-between select-none relative z-10", activeStyles.font)}>
            <div className="space-y-1">
              <span className="text-[7px] uppercase tracking-widest opacity-40">Categoría</span>
              <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: activeStyles.primary }}>
                🥤 Granizados
              </h4>
            </div>

            {/* Card de Producto de Previsualización */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: activeStyles.text }}>
                    Mango Biche
                  </h5>
                  <p className="text-[7px] opacity-60 leading-tight mt-0.5" style={{ color: activeStyles.text }}>
                    Con limón, sal y pimienta.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center text-[10px] border border-white/5">
                  🥭
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-[9px] font-black" style={{ color: activeStyles.primary }}>
                  $8.500
                </span>
                <span className="text-[7px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">
                  15 Disp.
                </span>
              </div>
            </div>

            {/* Footer miniatura */}
            <div className="text-center opacity-40 border-t border-white/5 pt-1.5">
              <p className="text-[6px] uppercase tracking-widest" style={{ color: activeStyles.text }}>
                {commercialName || "Pekao"} • Click para Pedir
              </p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary italic flex items-center justify-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            Visualización WYSIWYG
          </p>
          <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-bold">
            Los cambios cromáticos se reflejan al instante
          </p>
        </div>

      </CardContent>
    </Card>
  );
}

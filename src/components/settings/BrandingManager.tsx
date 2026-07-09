import { Check, Palette, Sparkles } from "lucide-react";
import { useBranding } from "@/context/BrandingContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface BrandingManagerProps {
  className?: string;
}

export default function BrandingManager({ className }: BrandingManagerProps) {
  const { themeId, changeTheme, appThemes } = useBranding();

  return (
    <Card className={cn("bg-slate-950/40 border border-white/10 rounded-2xl shadow-pro backdrop-blur-md overflow-hidden p-6", className)}>
      <CardHeader className="p-0 pb-6 border-b border-white/5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-primary shadow-glow-pro transition-all duration-300"
              style={{ backgroundColor: "rgba(var(--primary-hsl), 0.1)", border: "1px solid rgba(var(--primary-hsl), 0.2)" }}
            >
              <Palette className="w-5 h-5 animate-pulse text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-black italic uppercase font-space-grotesk tracking-widest text-foreground">
                Selector de Temas
              </CardTitle>
              <CardDescription className="text-[9px] font-bold text-foreground/20 uppercase tracking-widest italic leading-none font-space-grotesk">
                Alterna la ambientación estética y paleta del sistema
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic text-primary/70 font-space-grotesk">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
            Ecosistema Multimarca
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {appThemes.map((theme, index) => {
            const isActive = theme.id === themeId;
            
            return (
              <motion.button
                key={theme.id}
                type="button"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => changeTheme(theme.id)}
                className={cn(
                  "flex flex-col text-left p-4 rounded-xl border transition-all duration-300 relative group h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
                  isActive 
                    ? "bg-white/[0.04] border-primary shadow-[0_0_20px_rgba(var(--brand-primary-h),100%,60%,0.15)]" 
                    : "bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02] hover:scale-[1.02]"
                )}
              >
                {/* Indicador Check de selección */}
                {isActive && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-glow-pro">
                    <Check className="w-3 h-3 text-white font-bold" />
                  </div>
                )}

                {/* Previsualización Cromática con Gradiente */}
                <div className="flex gap-2 mb-4 shrink-0">
                  <div 
                    className="w-6 h-6 rounded-full border border-white/15 shadow-pro group-hover:scale-110 transition-transform duration-300" 
                    style={{ backgroundColor: theme.primaryColor }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full border border-white/15 shadow-pro opacity-80" 
                    style={{ backgroundColor: theme.borderColor || "#ffffff20" }}
                  />
                </div>

                {/* Información del Tema */}
                <div className="space-y-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black italic uppercase tracking-wider text-slate-200 font-space-grotesk group-hover:text-primary transition-colors">
                      {theme.name}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider italic font-mono mt-0.5">
                      HSL: {theme.hslBase.h} {theme.hslBase.s}% {theme.hslBase.l}%
                    </p>
                  </div>
                  <p className="text-[9px] text-slate-400/70 font-medium leading-relaxed mt-4">
                    {theme.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

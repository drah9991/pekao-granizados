import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DashboardCustomizer from "@/components/dashboard/DashboardCustomizer";

interface DashboardHeaderProps {
  period: string;
  setPeriod: (period: "today" | "week" | "month" | "year") => void;
  uiConfig: any;
  setUiConfig: (config: any) => void;
  isSavingConfig: boolean;
  handleSaveConfig: () => void;
}

export default function DashboardHeader({
  period,
  setPeriod,
  uiConfig,
  setUiConfig,
  isSavingConfig,
  handleSaveConfig
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-border/50 relative">
      <div className="absolute -left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full shadow-glow-pro" />
      <div className="animate-pro-in">
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-2">
          INTELIGENCIA <span className="text-primary text-glow italic">DE NEGOCIO</span>
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-space-grotesk italic">
           Sincronización v2.0 • {format(new Date(), "eeee d MMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="flex items-center gap-1 p-1.5 glass-pro rounded-[1.5rem] self-start border-border overflow-x-auto no-scrollbar max-w-full shadow-inner">
        {(['today', 'week', 'month', 'year'] as const).map((p) => (
          <Button
            key={p}
            variant="ghost"
            className={cn(
              "px-6 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500",
              period === p 
                ? "bg-primary text-primary-foreground shadow-glow-pro scale-105" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
            onClick={() => setPeriod(p)}
          >
            {p === 'today' ? 'Hoy' : (p === 'week' ? 'Semana' : (p === 'month' ? 'Mes' : 'Año'))}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-4">
          <DashboardCustomizer 
            config={uiConfig} 
            onChange={setUiConfig} 
            onSave={handleSaveConfig} 
            isSaving={isSavingConfig}
          />
      </div>
    </div>
  );
}

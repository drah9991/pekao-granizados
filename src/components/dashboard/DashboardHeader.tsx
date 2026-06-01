import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DashboardCustomizer from "@/components/dashboard/DashboardCustomizer";

interface DashboardHeaderProps {
  period: string;
  setPeriod: (period: "today" | "week" | "month" | "year") => void;
  uiConfig: Record<string, unknown>;
  setUiConfig: (config: Record<string, unknown>) => void;
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
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-border dark:border-white/5 relative">
      <div className="animate-pro-in">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-dm-sans tracking-tight text-foreground mb-3 uppercase">
          Dashboard <span className="text-primary italic dark:not-italic">Analítico</span>
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground dark:text-muted-foreground/40 font-dm-sans">
           Enterprise Sync v2.0 • {format(new Date(), "eeee d MMMM yyyy", { locale: es })}
        </p>
      </div>

      <div className="flex items-center gap-1.5 p-1.5 bg-muted/30 dark:bg-white/[0.03] border border-border dark:border-white/5 rounded-2xl self-start overflow-x-auto no-scrollbar max-w-full shadow-sm dark:shadow-pro">
        {(['today', 'week', 'month', 'year'] as const).map((p) => (
          <Button
            key={p}
            variant="ghost"
            className={cn(
              "px-5 h-10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
              period === p 
                ? "bg-primary text-white shadow-glow" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/5"
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

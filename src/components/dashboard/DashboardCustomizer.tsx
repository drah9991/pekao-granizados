import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings2, Eye, EyeOff, Layout, Save, RotateCcw } from "lucide-react";

export interface DashboardConfig {
  showStats: boolean;
  showChart: boolean;
  showPaymentMethods: boolean;
  showMixtureStock: boolean;
  showPopularProducts: boolean;
  showRecentSales: boolean;
}

export const defaultDashboardConfig: DashboardConfig = {
  showStats: true,
  showChart: true,
  showPaymentMethods: true,
  showMixtureStock: true,
  showPopularProducts: true,
  showRecentSales: true,
};

interface DashboardCustomizerProps {
  config: DashboardConfig;
  onChange: (config: DashboardConfig) => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function DashboardCustomizer({ config, onChange, onSave, isSaving }: DashboardCustomizerProps) {
  const toggleWidget = (key: keyof DashboardConfig) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };

  const widgets = [
    { key: "showStats", label: "Tarjetas de Resumen", description: "Ventas totales, pedidos y ticket promedio.", icon: Layout },
    { key: "showChart", label: "Gráfico de Tendencia", description: "Flujo de ventas por hora.", icon: Save },
    { key: "showPaymentMethods", label: "Métodos de Pago", description: "Distribución de ingresos por canal.", icon: Layout },
    { key: "showMixtureStock", label: "Estado de Mezclas", description: "Niveles críticos de granizados.", icon: Layout },
    { key: "showPopularProducts", label: "Productos Populares", description: "Top 5 productos más vendidos.", icon: Layout },
    { key: "showRecentSales", label: "Ventas Recientes", description: "Últimas 5 transacciones en tiempo real.", icon: Layout },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 rounded-xl gap-2 bg-white/[0.03] border-white/10 hover:border-primary/50 transition-all group font-dm-sans">
          <Settings2 className="w-4 h-4 text-primary transition-transform group-hover:rotate-90" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Personalizar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0b0f1a]/95 backdrop-blur-3xl border-white/5 sm:max-w-[500px] rounded-3xl overflow-hidden p-0 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <DialogHeader className="p-8 border-b border-white/5 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/10">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight font-dm-sans">
            Configuración Visual
          </DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 font-dm-sans">
            Parametrización Operativa v2.0
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6 relative z-10 max-h-[400px] overflow-y-auto no-scrollbar">
          {widgets.map((widget) => {
            const isActive = config[widget.key as keyof DashboardConfig];
            return (
              <div 
                key={widget.key} 
                className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border ${
                  isActive ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? "bg-primary text-white shadow-glow-pro" : "bg-muted text-muted-foreground"
                  }`}>
                    {isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black uppercase italic tracking-wider">{widget.label}</h4>
                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">{widget.description}</p>
                  </div>
                </div>
                <Switch 
                  checked={isActive} 
                  onCheckedChange={() => toggleWidget(widget.key as keyof DashboardConfig)}
                />
              </div>
            );
          })}
        </div>

        <DialogFooter className="p-8 bg-white/[0.02] border-t border-white/5 relative z-10">
           <div className="flex w-full gap-4">
              <Button 
                variant="ghost" 
                onClick={() => onChange(defaultDashboardConfig)}
                className="flex-1 h-14 rounded-2xl text-[10px] font-bold uppercase tracking-widest gap-2 font-dm-sans"
              >
                <RotateCcw className="w-4 h-4" />
                Restablecer
              </Button>
              <Button 
                onClick={onSave}
                disabled={isSaving}
                className="flex-[2] h-14 rounded-2xl bg-primary text-white font-bold uppercase tracking-widest gap-2 shadow-glow hover:bg-primary/90 transition-all font-dm-sans"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
        <Button variant="outline" className="h-11 rounded-xl gap-2 glass-pro border-primary/20 hover:border-primary transition-all">
          <Settings2 className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest italic">Personalizar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-pro border-white/10 sm:max-w-[500px] rounded-[2.5rem] overflow-hidden p-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <DialogHeader className="p-8 border-b border-white/5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter font-space-grotesk">
            Configuración Visual
          </DialogTitle>
          <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground italic">
            Parametrización de Inteligencia de Negocio v2.0
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

        <DialogFooter className="p-8 bg-muted/20 border-t border-white/5 relative z-10">
           <div className="flex w-full gap-4">
              <Button 
                variant="ghost" 
                onClick={() => onChange(defaultDashboardConfig)}
                className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              <Button 
                onClick={onSave}
                disabled={isSaving}
                className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest gap-2 shadow-glow-pro hover:bg-primary/80 transition-all"
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

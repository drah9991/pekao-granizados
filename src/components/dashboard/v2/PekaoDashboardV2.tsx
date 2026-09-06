import React, { Component, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/hooks/useDashboard";
import { adaptRawToV2Dashboard } from "@/adapters/dashboardAdapter";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { KpiSection } from "./KpiSection";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { OperationsSection } from "./OperationsSection";
import { RefreshCw, AlertTriangle, Sparkles, Layers, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Local Isolated Error Boundary Component for Non-blocking Failures
interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class WidgetErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard Widget Error Catch:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-rose-500/30 text-center space-y-3 font-space-grotesk italic">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-black uppercase text-slate-200 tracking-wider">
            {this.props.fallbackTitle || "Error al cargar widget"}
          </h4>
          <p className="text-[10px] text-rose-400 font-medium">
            El widget falló de forma aislada sin afectar el resto del sistema.
          </p>
          <Button 
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
            className="h-8 text-[10px] font-black uppercase tracking-widest border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            Reintentar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function PekaoDashboardV2() {
  const { storeId } = useAuth();
  const navigate = useNavigate();
  const {
    period,
    setPeriod,
    isLoading,
    isPending,
    error,
    dashboardData,
    comparisonLabel
  } = useDashboard(storeId);

  const adaptedData = React.useMemo(() => {
    if (!dashboardData) return null;
    return adaptRawToV2Dashboard(dashboardData, period, comparisonLabel);
  }, [dashboardData, period, comparisonLabel]);

  if (isLoading && !adaptedData) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/90 border border-rose-500/30 text-center max-w-md mx-auto my-12 space-y-4 font-space-grotesk italic">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-white uppercase tracking-wider">
          Error en Sincronización
        </h3>
        <p className="text-xs text-rose-400 font-medium">
          {error.message || "Fallo en la comunicación de datos de sucursal."}
        </p>
        <Button 
          onClick={() => window.location.reload()}
          className="w-full bg-[#FF007F] hover:bg-[#FF007F]/80 text-white font-black text-xs uppercase tracking-widest h-11 rounded-xl shadow-glow-pro"
        >
          Reintentar Carga
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 font-space-grotesk italic bg-[#0B0F17] p-4 sm:p-6 lg:p-8 rounded-3xl border border-slate-800/80 shadow-2xl">
      
      {/* V2 Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#FF007F]/20 text-[#FF007F] border border-[#FF007F]/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-black uppercase tracking-tight text-white italic">
              Pekao <span className="text-[#FF007F]">Analytics V2</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Monitor operativo y financiero restobar en tiempo real
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'today', label: 'Hoy' },
              { id: 'week', label: '7 Días' },
              { id: 'month', label: '30 Días' },
              { id: 'year', label: 'Año' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={cn(
                  "px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                  period === p.id
                    ? "bg-[#39FF14] text-black font-black shadow-[0_0_12px_rgba(57,255,20,0.4)]"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            onClick={() => navigate('/pos')}
            size="sm"
            className="h-9 bg-[#FF007F] hover:bg-[#FF007F]/80 text-white font-black text-xs uppercase tracking-widest rounded-xl px-4 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,0,127,0.3)] cursor-pointer"
          >
            <span>POS Vender</span>
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* A. Modular KPI Ribbon */}
      <WidgetErrorBoundary fallbackTitle="Error en Métricas KPI">
        <KpiSection data={adaptedData?.kpis} />
      </WidgetErrorBoundary>

      {/* B. Analytical Grid */}
      <WidgetErrorBoundary fallbackTitle="Error en Gráficos Analíticos">
        <AnalyticsCharts data={adaptedData?.charts} />
      </WidgetErrorBoundary>

      {/* C. Operational Summary */}
      <WidgetErrorBoundary fallbackTitle="Error en Resumen Operativo">
        <OperationsSection data={adaptedData?.operations} />
      </WidgetErrorBoundary>

      {/* Footer Timestamp */}
      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
        <span>Pekao Restobar OS • V2.0 High-Performance</span>
        <span>Última actualización: {adaptedData?.lastUpdated || new Date().toLocaleTimeString('es-CO')}</span>
      </div>

    </div>
  );
}

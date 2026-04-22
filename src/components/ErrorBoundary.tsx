import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureError } from "@/lib/sentry";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL RUNTIME ERROR:", error);
    console.error("COMPONENT STACK:", errorInfo.componentStack);
    
    // Report to Sentry with detailed context
    captureError(error, {
      module: this.props.fallbackTitle || "Global",
      componentStack: errorInfo.componentStack,
      errorMessage: error.message,
    });
  }


  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-screen items-center justify-center bg-[#0F1117] p-10 text-white">
          <div className="max-w-md w-full bg-[#1C1F26] rounded-[2.5rem] p-10 shadow-2xl text-center border border-white/5">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">
              {this.props.fallbackTitle || "Algo salió mal"}
            </h2>
            <p className="text-slate-400 font-medium text-sm mb-6">
              Ocurrió un error inesperado en este módulo. Puedes intentar recargar o volver al inicio.
            </p>

            <div className="bg-black/30 rounded-2xl p-4 mb-6 text-left overflow-hidden">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-2">Detalle del error</p>
              <p className="text-xs font-mono text-red-300/70 break-all leading-relaxed">
                {this.state.error?.message || "Error desconocido"}
                {process.env.NODE_ENV === 'development' && (
                  <span className="block mt-2 opacity-50 border-t border-red-500/20 pt-2 text-[8px]">
                    {this.state.error?.stack?.substring(0, 500)}...
                  </span>
                )}
              </p>

            </div>

            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                className="flex-1 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
              <Button
                onClick={() => window.location.href = "/dashboard"}
                className="flex-1 h-12 rounded-2xl gradient-primary font-bold shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.4)] transition-all"
              >
                Ir al Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

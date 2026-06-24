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
        <div className="flex flex-col h-full min-h-[400px] w-full items-center justify-center p-6 animate-pro-in">
          <div className="max-w-md w-full bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-2xl text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2 text-foreground">
              {this.props.fallbackTitle || "Módulo no disponible"}
            </h2>
            <p className="text-muted-foreground font-medium text-sm mb-6">
              Ocurrió un error inesperado. El resto del sistema sigue operativo.
            </p>

            <div className="bg-muted/50 rounded-2xl p-4 mb-6 text-left overflow-hidden border border-border/30">
              <p className="text-[10px] font-black text-destructive uppercase tracking-[0.2em] mb-2">Detalle del error</p>
              <p className="text-xs font-mono text-destructive/80 break-all leading-relaxed">
                {this.state.error?.message || "Error desconocido"}
                {process.env.NODE_ENV === 'development' && (
                  <span className="block mt-2 opacity-50 border-t border-destructive/20 pt-2 text-[8px]">
                    {this.state.error?.stack?.substring(0, 500)}...
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1 h-12 rounded-2xl font-bold transition-all border-border/50 hover:bg-muted"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recargar
              </Button>
              <Button
                onClick={() => window.location.href = "/dashboard"}
                className="flex-1 h-12 rounded-2xl gradient-primary font-bold shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.4)] transition-all"
              >
                Ir a Inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

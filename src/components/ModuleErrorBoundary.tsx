import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Granular Error Boundary Component
 * Wraps individual modules to prevent cascading failures
 */
class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { moduleName, onError } = this.props;

    console.error(`Error in ${moduleName || 'Module'}:`, error, errorInfo);

    // Send to error tracking service (Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          module: moduleName || 'unknown',
        },
      });
    }

    if (onError) {
      onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, moduleName } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">
                Error en {moduleName || 'el módulo'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Ha ocurrido un error inesperado. Intenta recargar este módulo.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-left p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <summary className="cursor-pointer text-sm font-medium text-destructive mb-2">
                  Detalles del error
                </summary>
                <pre className="text-xs overflow-auto max-h-40 text-muted-foreground">
                  {error.toString()}
                  {errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <Button
                onClick={this.handleReset}
                variant="default"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Ir al inicio
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ModuleErrorBoundary;

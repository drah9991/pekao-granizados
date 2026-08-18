import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, CreditCard, AlertTriangle, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SubscriptionLock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { subscriptionStatus, isLoading, userRole } = useAuth();

  // If loading or no active session, just render children (auth routing handles protection)
  if (isLoading || !subscriptionStatus) {
    return <>{children}</>;
  }

  // If status is not inactive, allow access
  if (subscriptionStatus !== 'inactive') {
    return <>{children}</>;
  }

  // If inactive, block access
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-card border shadow-2xl rounded-2xl p-8 space-y-6 animate-in fade-in zoom-in duration-300">
        
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Acceso Suspendido</h2>
          <p className="text-muted-foreground">
            El sistema de punto de venta ha sido bloqueado automáticamente porque la suscripción asociada a este negocio se encuentra inactiva.
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg flex gap-3 text-left items-start">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            No es posible registrar nuevas ventas ni modificar inventarios. Tus datos están seguros y puedes seguir exportando reportes.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          {userRole === 'owner' || userRole === 'admin' ? (
            <Button className="w-full gap-2" size="lg">
              <CreditCard className="w-4 h-4" />
              Renovar Suscripción
            </Button>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium pb-2">
              Por favor, contacta al administrador de la tienda para renovar la suscripción.
            </p>
          )}
          
          <Button variant="outline" className="w-full gap-2" onClick={() => window.location.href = '/dashboard'}>
            <DownloadCloud className="w-4 h-4" />
            Exportar mi Información
          </Button>
        </div>
      </div>
    </div>
  );
};

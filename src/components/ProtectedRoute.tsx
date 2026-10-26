import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { Enums } from '@/integrations/supabase/types';
import { Loader2 } from 'lucide-react';
import { SubscriptionLock } from './SubscriptionLock';

type AppRole = Enums<'app_role'>;

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole | AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading, userRole, isSuperAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0F1117]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Sin rol (cliente de la app móvil, o alta de usuario a medias) no se entra a
  // una pantalla que exige rol; antes `userRole` nulo se saltaba la comprobación.
  if (requiredRole && !isSuperAdmin) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!userRole || !rolesArray.includes(userRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <SubscriptionLock>
      {children}
    </SubscriptionLock>
  );
};

export default ProtectedRoute;

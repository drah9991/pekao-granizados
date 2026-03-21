import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Role } from '@/types/navigation';

export function useCurrentRole() {
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getRole() {
      const { data: { session } } = await supabase.auth.getSession();
      // El usuario solicitó leer desde user_metadata.role
      const userRole = session?.user?.user_metadata?.role as Role;
      
      // Fallback a null si no existe en metadata
      setRole(userRole || null);
      setIsLoading(false);
    }
    getRole();
  }, []);

  return { role, isLoading };
}

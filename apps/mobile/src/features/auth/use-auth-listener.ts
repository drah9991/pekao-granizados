import { useEffect } from 'react';

import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

import { accessQueryRoot } from './api/use-access';
import { useSessionStore } from './session-store';

/** Sincroniza la sesión de Supabase con el store. Se monta una vez en el layout raíz. */
export function useAuthListener(): void {
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        queryClient.removeQueries({ queryKey: accessQueryRoot });
        queryClient.removeQueries({ queryKey: ['admin'] });
      }
    });

    return () => data.subscription.unsubscribe();
  }, [setSession]);
}

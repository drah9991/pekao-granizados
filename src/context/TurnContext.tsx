import React, { useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useTurnStore } from '@/store/useTurnStore';

export function TurnProvider({ children }: { children: ReactNode }) {
  const { storeId } = useAuth();
  const fetchActiveTurn = useTurnStore(state => state.fetchActiveTurn);

  useEffect(() => {
    if (!storeId) return;
    fetchActiveTurn(storeId);

    // Suscripción Realtime
    const channel = supabase
      .channel('cash_turns_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_turns',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          fetchActiveTurn(storeId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, fetchActiveTurn]);

  return <>{children}</>;
}

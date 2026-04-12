import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAlerts } from './useAlerts';
import { useAuth } from '@/context/AuthContext';

export const useRealtimeAlerts = () => {
  const { notifyInfo, notifyWarning, notifyCritical } = useAlerts();
  const { storeId } = useAuth();

  useEffect(() => {
    if (!storeId) return;

    // Listen for system events (real-time notifications from the server/DB)
    const systemEventsChannel = supabase
      .channel('system-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const { severity, message } = payload.new;
          
          switch (severity) {
            case 'info':
              notifyInfo(message);
              break;
            case 'warning':
              notifyWarning(message);
              break;
            case 'critical':
              notifyCritical(message);
              break;
            default:
              notifyInfo(message);
          }
        }
      )
      .subscribe();

    // Specific listener for inventory stockouts (Warning level)
    const inventoryChannel = supabase
      .channel('inventory-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const { stock, name } = payload.new;
          if (stock === 0) {
            notifyWarning(`STOCK AGOTADO: ${name}`, 8000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(systemEventsChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, [storeId, notifyInfo, notifyWarning, notifyCritical]);
};

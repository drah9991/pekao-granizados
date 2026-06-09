import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAlerts } from './useAlerts';
import { useAuth } from '@/context/AuthContext';
import { requestNotificationPermission, sendLocalNotification } from '@/utils/notifications';

export const useRealtimeAlerts = () => {
  const { notifyInfo, notifyWarning, notifyCritical } = useAlerts();
  const { storeId } = useAuth();

  useEffect(() => {
    // Request notification permission on initialization
    requestNotificationPermission();
  }, []);

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
              sendLocalNotification("Pekao POS - Información", { body: message });
              break;
            case 'warning':
              notifyWarning(message);
              sendLocalNotification("⚠️ Alerta Pekao POS", { body: message });
              break;
            case 'critical':
              notifyCritical(message);
              sendLocalNotification("🚨 CRÍTICO - Pekao POS", { body: message });
              break;
            default:
              notifyInfo(message);
              sendLocalNotification("Notificación Pekao POS", { body: message });
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
            sendLocalNotification("⚠️ Inventario Agotado", {
              body: `El producto ${name} se ha quedado sin stock en la tienda.`,
              tag: `stockout-${name}`
            });
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

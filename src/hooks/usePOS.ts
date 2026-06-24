import * as Sentry from "@sentry/react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseRpc } from "@/integrations/supabase/types-extensions";
import { useAuth } from "@/context/AuthContext";
import { useTurn } from "@/hooks/useTurn";
import { offlineService } from "@/lib/OfflineService";
import { useSyncStore } from "@/store/useSyncStore";
import { useAlerts } from "@/hooks/useAlerts";
import { useQueryClient } from "@tanstack/react-query";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";

export function usePOS() {
  const { user, storeId } = useAuth();
  const queryClient = useQueryClient();
  const { activeTurn } = useTurn();
  const { notifyInfo, notifyWarning, notifyCritical } = useAlerts();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const pendingOrders = useSyncStore((state) => state.syncQueue);
  const pendingOrdersCount = pendingOrders.length;

  const registerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-orders');
      } catch (err) {
        console.warn("Background sync registration failed:", err);
      }
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      handleSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        notifyInfo(`Sincronización en segundo plano: ${event.data.successCount} pedidos subidos.`);
        queryClient.invalidateQueries({ queryKey: ['tank-status'] });
        queryClient.invalidateQueries({ queryKey: ['products-grid'] });
      } else if (event.data && event.data.type === 'SYNC_ERROR') {
        notifyWarning(`Error en sincronización en segundo plano: ${event.data.message}`);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [queryClient]);

  const checkPendingOrders = async () => {
    // Reactivo mediante useSyncStore
  };

  const processSale = async (
    cart: Record<string, unknown>[],
    saleTotal: number,
    saleSubtotal: number,
    saleDiscountAmount: number,
    saleCustomer: Record<string, unknown> | null,
    method: PaymentMethod, 
    amountReceived: number, 
    deliveryData?: {
      type: 'pickup' | 'delivery';
      fee: number;
      address: string;
      phone: string;
    },
    splitDetails?: { cash: number; transfer: number }
  ) => {
    setIsProcessing(true);

    try {
      if (!user) throw new Error("Usuario no autenticado.");
      if (!storeId) throw new Error("No se pudo obtener la información de la sucursal.");

      if (!activeTurn || activeTurn.status === 'paused') {
        notifyCritical("Debes tener un turno activo para procesar ventas.");
        setIsProcessing(false);
        return null;
      }

      const mappedItems = cart.flatMap((item: Record<string, unknown>) => {
        const toppings = (item.toppings as Record<string, unknown>[]) || [];
        const toppingsPrice = toppings.reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.price), 0);
        const baseItemPrice = Number(item.price) - toppingsPrice;

        const mainItem = {
          product_id: item.productId as string,
          quantity: item.quantity as number,
          price: baseItemPrice,
          name: item.name as string,
          size: (item.size as string) || null,
          size_multiplier: (item.sizeMultiplier as number) || 1,
          base_volume: (item.baseVolume as number) || 4
        };

        const toppingItems = toppings.map((topping: Record<string, unknown>) => ({
          product_id: topping.id as string,
          quantity: item.quantity as number,
          price: Number(topping.price),
          name: `Topping: ${topping.name}`,
          size: null,
          size_multiplier: 1
        }));

        return [mainItem, ...toppingItems];
      });

      const salePayload = {
        store_id: storeId,
        employee_id: user.id,
        customer_id: saleCustomer?.id === 'generic' ? null : saleCustomer?.id,
        subtotal: saleSubtotal,
        delivery_fee: deliveryData?.fee || 0,
        order_type: deliveryData?.type || 'pickup',
        delivery_address: deliveryData?.address || null,
        delivery_phone: deliveryData?.phone || null,
        total: saleTotal + (deliveryData?.fee || 0),
        payment: method === 'split' ? { 
          method: 'split',
          details: splitDetails
        } : { method },
        items: mappedItems
      };

      const optimisticOrderId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const orderData = {
        id: optimisticOrderId,
        total: saleTotal + (deliveryData?.fee || 0),
        subtotal: saleSubtotal,
        discountAmount: saleDiscountAmount,
        created_at: new Date().toISOString(),
        items: [...cart],
        change: method === "cash" ? Math.max(0, amountReceived - (saleTotal + (deliveryData?.fee || 0))) : 0,
        customer: saleCustomer,
        deliveryData,
        paymentMethod: method,
        splitDetails
      };

      // Optimistic update for machine tanks
      try {
        const cachedGrid = queryClient.getQueryData(['products-grid', storeId]) as Record<string, unknown> | undefined;
        if (cachedGrid?.products) {
          const queryCache = queryClient.getQueryCache();
          const tankQueries = queryCache.findAll({ queryKey: ['tank-status', storeId] });

          tankQueries.forEach((q) => {
            const queryKey = q.queryKey;
            queryClient.setQueryData(queryKey, (oldTanks: unknown) => {
              if (!Array.isArray(oldTanks)) return oldTanks;
              return oldTanks.map((tank: Record<string, unknown>) => {
                let updatedVolume = tank.current_volume_ml as number;
                
                (cart as Record<string, unknown>[]).forEach((item: Record<string, unknown>) => {
                  const productsList = (cachedGrid?.products as Record<string, unknown>[]) || [];
                  const product = productsList.find((p: Record<string, unknown>) => p.id === item.productId);
                  const recipes = (product?.recipes as Record<string, unknown>[]) || [];
                  if (recipes.length > 0) {
                    recipes.forEach((recipe: Record<string, unknown>) => {
                      if (recipe.inventory_item_id === tank.inventory_item_id) {
                        const multiplier = (item.sizeMultiplier as number) || 1;
                        const deduction = (Number(recipe.quantity_required) || 0) * Number(item.quantity) * multiplier;
                        updatedVolume = Math.max(0, updatedVolume - deduction);
                      }
                    });
                  }
                });

                if (updatedVolume !== (tank.current_volume_ml as number)) {
                  const percentage = Math.round((updatedVolume / (tank.max_capacity_ml as number)) * 100 * 100) / 100;
                  return {
                    ...tank,
                    current_volume_ml: updatedVolume,
                    percentage
                  };
                }
                return tank;
              });
            });
          });
        }
      } catch (optError) {
        console.error("Error doing optimistic update of tank status:", optError);
      }

      // Procesamiento asíncrono en segundo plano (Optimistic UI Fire-and-Forget)
      (async () => {
        try {
          if (isOnline) {
            const { error: rpcError } = await supabaseRpc<string>('process_sale', {
              sale_data: salePayload as Record<string, unknown>
            });

            if (rpcError) throw rpcError;
            
            // Revalidación en segundo plano tras éxito
            Promise.all([
              queryClient.invalidateQueries({ queryKey: ['products-grid'] }),
              queryClient.invalidateQueries({ queryKey: ['tank-status'] })
            ]);
          } else {
            useSyncStore.getState().addToQueue(salePayload);
            registerBackgroundSync();
          }
        } catch (error: unknown) {
          console.error("Error background processing sale:", error);
          Sentry.captureException(error);
          
          // Fallback silencioso: encolar localmente
          try {
            useSyncStore.getState().addToQueue(salePayload);
            registerBackgroundSync();
            notifyWarning("Red inestable: Venta guardada offline para reintento automático.");
          } catch (offlineErr) {
            Sentry.captureException(offlineErr);
          }
        }
      })();

      notifyInfo("¡Venta procesada exitosamente!");
      setIsProcessing(false);
      
      return orderData;
    } catch (error: unknown) {
      setIsProcessing(false);
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error processing sale:", error);
      notifyCritical("Error al procesar la venta: " + msg);
      return null;
    }
  };

  const handleSync = async () => {
    if (!navigator.onLine) {
      return;
    }

    const pending = useSyncStore.getState().syncQueue;
    if (pending.length === 0) {
      return;
    }

    setIsProcessing(true);
    try {
      let successCount = 0;
      for (const order of pending) {
        try {
          const { error } = await supabaseRpc('process_sale', {
            sale_data: order.payload as Record<string, unknown>
          });
          if (!error) {
            useSyncStore.getState().removeFromQueue(order.id);
            successCount++;
          }
        } catch (e) {
          console.error("Error syncing order:", order.id, e);
        }
      }

      if (successCount > 0) {
        notifyInfo(`Sincronización completada: ${successCount} pedidos subidos.`);
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ['tank-status'] }),
          queryClient.invalidateQueries({ queryKey: ['products-grid'] })
        ]);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      notifyCritical("Error durante la sincronización: " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    isOnline,
    pendingOrdersCount,
    pendingOrders,
    processSale,
    handleSync,
    checkPendingOrders
  };
}

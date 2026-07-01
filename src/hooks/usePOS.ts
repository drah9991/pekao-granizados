import * as Sentry from "@sentry/react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseRpc } from "@/integrations/supabase/types-extensions";
import { useAuth } from "@/context/AuthContext";
import { useTurn } from "@/hooks/useTurn";
import { offlineService } from "@/lib/OfflineService";
import { useSyncStore } from "@/store/useSyncStore";
import { useAlerts } from "@/hooks/useAlerts";
import { useQueryClient } from "@tanstack/react-query";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";
import { calculateOptimisticTanks, calculateOptimisticProducts } from "@/lib/inventory-sync-utils";
import type { Product, CartItem, TankStatus } from "@/lib/inventory-sync-utils";

const isValidationError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, unknown>;
  const code = String(err.code || '');
  const status = Number(err.status || 0);
  
  return (
    code === 'P0001' ||
    code.startsWith('23') ||
    status === 400 ||
    status === 409
  );
};

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
        const regWithSync = registration as unknown as { sync: { register: (tag: string) => Promise<void> } };
        await regWithSync.sync.register('sync-orders');
      } catch (err) {
        console.warn("Background sync registration failed:", err);
      }
    }
  };

  // ── handleSync must be declared BEFORE any useEffect that calls it ──────────
  const handleSync = useCallback(async () => {
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
          } else {
            console.error("Error syncing order:", order.id, error);
            const status = error && typeof error === 'object' ? Number((error as Record<string, unknown>).status || 0) : 0;
            if (status === 401 || status === 403) {
              break;
            }
            if (isValidationError(error)) {
              useSyncStore.getState().removeFromQueue(order.id);
              notifyWarning(`Pedido eliminado de la cola debido a un error de validación permanente: ${String((error as Record<string, unknown>).message || JSON.stringify(error))}`);
            } else {
              break;
            }
          }
        } catch (e: unknown) {
          console.error("Error syncing order:", order.id, e);
          const err = e as Record<string, unknown>;
          const status = err && typeof err === 'object' ? Number(err.status || 0) : 0;
          if (status === 401 || status === 403) {
            break;
          }
          if (isValidationError(e)) {
            useSyncStore.getState().removeFromQueue(order.id);
            notifyWarning(`Pedido eliminado de la cola debido a un error de validación permanente: ${String(err.message || e)}`);
          } else {
            break;
          }
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
  }, [queryClient, notifyInfo, notifyWarning, notifyCritical]);
  // ────────────────────────────────────────────────────────────────────────────

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
  }, [handleSync]);

  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        notifyInfo(`Sincronización en segundo plano: ${Number(event.data.successCount || 0)} pedidos subidos.`);
        queryClient.invalidateQueries({ queryKey: ['tank-status'] });
        queryClient.invalidateQueries({ queryKey: ['products-grid'] });
      } else if (event.data && event.data.type === 'SYNC_ERROR') {
        notifyWarning(`Error en sincronización en segundo plano: ${String(event.data.message || '')}`);
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
  }, [queryClient, notifyInfo, notifyWarning]);

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
      type: 'pickup' | 'delivery' | 'print_center';
      fee: number;
      address: string;
      phone: string;
    },
    splitDetails?: { cash: number; transfer: number },
    metadata?: Record<string, unknown>
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
          product_id: item.productId === 'generic' || item.productId === 'generic-copy-service' ? null : (item.productId as string),
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

      const paymentData = method === 'split' ? { 
        method: 'split',
        details: splitDetails,
        ...metadata
      } : { method, ...metadata };

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
        payment: paymentData,
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

      // Optimistic update for machine tanks and product stock
      try {
        const cachedGrid = queryClient.getQueryData(['products-grid', storeId]) as { products: Product[] } | undefined;
        if (cachedGrid?.products) {
          // 1. Update products-grid cache
          const updatedProducts = calculateOptimisticProducts(cart as CartItem[], cachedGrid.products);
          queryClient.setQueryData(['products-grid', storeId], {
            ...cachedGrid,
            products: updatedProducts
          });

          // 2. Update tank status queries
          const queryCache = queryClient.getQueryCache();
          const tankQueries = queryCache.findAll({ queryKey: ['tank-status', storeId] });

          tankQueries.forEach((q) => {
            const queryKey = q.queryKey;
            queryClient.setQueryData(queryKey, (oldTanks: unknown) => {
              return calculateOptimisticTanks(cart as CartItem[], oldTanks as TankStatus[], cachedGrid.products);
            });
          });
        }
      } catch (optError) {
        console.error("Error doing optimistic update:", optError);
      }

      if (isOnline) {
        try {
          const { data: rpcData, error: rpcError } = await supabaseRpc<string>('process_sale', {
            sale_data: salePayload as Record<string, unknown>
          });

          if (rpcError) {
            throw rpcError;
          }
          
          // Revalidación tras éxito
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['products-grid'] }),
            queryClient.invalidateQueries({ queryKey: ['tank-status'] })
          ]);
        } catch (error: unknown) {
          console.error("Error processing sale online:", error);
          if (isValidationError(error)) {
            throw error;
          } else {
            useSyncStore.getState().addToQueue(salePayload);
            await registerBackgroundSync();
            notifyWarning("Red inestable: Venta guardada offline para reintento automático.");
          }
        }
      } else {
        useSyncStore.getState().addToQueue(salePayload);
        await registerBackgroundSync();
      }

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

  // handleSync was moved above the first useEffect that uses it (see earlier in the file)

  // Realtime subscription for products, store_stock, and inventory_items changes to update POS grid instantly
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel(`pos-realtime-sync-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products-grid', storeId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'store_stock',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products-grid', storeId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products-grid', storeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

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

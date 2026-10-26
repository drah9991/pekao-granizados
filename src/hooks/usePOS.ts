import * as Sentry from "@sentry/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseRpc } from "@/integrations/supabase/types-extensions";
import { useAuth } from "@/context/AuthContext";
import { useTurn } from "@/hooks/useTurn";
import { offlineService } from "@/lib/OfflineService";
import { useSyncStore } from "@/store/useSyncStore";
import type { SyncFailure } from "@/store/useSyncStore";
import { useAlerts } from "@/hooks/useAlerts";
import { useQueryClient } from "@tanstack/react-query";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";
import { calculateOptimisticTanks, calculateOptimisticProducts } from "@/lib/inventory-sync-utils";
import type { Product, CartItem, TankStatus } from "@/lib/inventory-sync-utils";
import { classifySyncError } from "@/lib/syncErrorPolicy";
import type { SyncOutcome } from "@/lib/syncErrorPolicy";

export function usePOS() {
  const { user, storeId } = useAuth();
  const queryClient = useQueryClient();
  const { activeTurn } = useTurn();
  const { notifyInfo, notifyWarning, notifyCritical } = useAlerts();

  const [isProcessing, setIsProcessing] = useState(false);
  // La sincronización de la cola tiene su propio estado: si compartiera isProcessing,
  // al terminar reactivaría el botón de cobro mientras una venta sigue esperando respuesta.
  const [isSyncing, setIsSyncing] = useState(false);
  const saleInFlightRef = useRef(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryBackoffDelay, setRetryBackoffDelay] = useState(1000);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  
  const pendingOrders = useSyncStore((state) => state.syncQueue);
  const pendingOrdersCount = pendingOrders.length;
  const failedOrders = useSyncStore((state) => state.failedQueue);
  const retryFailedOrder = useSyncStore((state) => state.retryFailed);

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
      setConsecutiveFailures(0);
      setRetryBackoffDelay(1000);
      return;
    }

    setIsSyncing(true);
    let successCount = 0;
    let hasFailure = false;

    try {
      for (const order of pending) {
        let outcome: SyncOutcome = 'synced';
        let failure: SyncFailure = { code: '', message: '' };
        try {
          const { error, status } = await supabaseRpc('process_sale', {
            sale_data: order.payload as Record<string, unknown>
          });
          if (error) {
            failure = { code: error.code || '', message: error.message || '' };
            outcome = classifySyncError({ code: error.code, status, message: error.message });
          }
        } catch (e: unknown) {
          failure = { code: '', message: e instanceof Error ? e.message : String(e) };
          outcome = 'retry';
        }

        if (outcome === 'synced') {
          useSyncStore.getState().removeFromQueue(order.id);
          successCount++;
          continue;
        }

        console.error("Error syncing order:", order.id, failure);
        hasFailure = true;
        if (outcome === 'retry') {
          break;
        }

        // La venta ya se cobró: se conserva como fallida, nunca se borra.
        useSyncStore.getState().moveToFailed(order.id, failure);
        Sentry.captureException(new Error(`process_sale rechazó una venta offline (${failure.code})`), {
          extra: { orderId: order.id, ...failure },
        });
        notifyCritical(`Venta offline rechazada por el servidor; quedó guardada para revisión: ${failure.message}`);
      }

      if (successCount > 0) {
        notifyInfo(`Sincronización completada: ${successCount} pedidos subidos.`);
        queryClient.invalidateQueries({ queryKey: ['tank-status'], refetchType: 'none' });
        queryClient.invalidateQueries({ queryKey: ['products-grid'], refetchType: 'none' });
        queryClient.invalidateQueries({ queryKey: ['dashboard-v2-raw'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      }

      if (hasFailure) {
        setConsecutiveFailures(prev => {
          const next = prev + 1;
          const nextDelay = Math.min(30000, 1000 * Math.pow(2, next));
          setRetryBackoffDelay(nextDelay);
          return next;
        });
      } else {
        setConsecutiveFailures(0);
        setRetryBackoffDelay(1000);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      notifyCritical("Error durante la sincronización: " + msg);
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, notifyInfo, notifyCritical]);
  // ────────────────────────────────────────────────────────────────────────────

  // Reintento periódico con Backoff Exponencial en background
  useEffect(() => {
    if (pendingOrdersCount === 0 || consecutiveFailures === 0 || !navigator.onLine) {
      return;
    }

    const timer = setTimeout(() => {
      handleSync();
    }, retryBackoffDelay);

    return () => clearTimeout(timer);
  }, [pendingOrdersCount, consecutiveFailures, retryBackoffDelay, handleSync]);

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
        if (Number(event.data.failedCount || 0) > 0) {
          notifyCritical(`${Number(event.data.failedCount)} ventas offline fueron rechazadas y quedaron guardadas para revisión.`);
        }
        queryClient.invalidateQueries({ queryKey: ['tank-status'], refetchType: 'none' });
        queryClient.invalidateQueries({ queryKey: ['products-grid'], refetchType: 'none' });
        queryClient.invalidateQueries({ queryKey: ['dashboard-v2-raw'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
  }, [queryClient, notifyInfo, notifyWarning, notifyCritical]);

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
    metadata?: Record<string, unknown>,
    // Clave estable del checkout (lib/checkoutKey); sin ella, una por llamada (cuenta dividida).
    idempotencyKey?: string
  ) => {
    // Un segundo clic mientras la venta espera respuesta no abre otro cobro.
    if (saleInFlightRef.current) return null;
    saleInFlightRef.current = true;
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

      const saleIdempotencyKey = idempotencyKey ?? crypto.randomUUID();

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
        items: mappedItems,
        idempotency_key: saleIdempotencyKey
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
        let rpcOutcome: SyncOutcome = 'synced';
        let rpcFailure: unknown = null;
        try {
          const { error: rpcError, status: rpcStatus } = await supabaseRpc<string>('process_sale', {
            sale_data: salePayload as Record<string, unknown>
          });
          if (rpcError) {
            rpcFailure = rpcError;
            rpcOutcome = classifySyncError({ code: rpcError.code, status: rpcStatus, message: rpcError.message });
          }
        } catch (error: unknown) {
          rpcFailure = error;
          rpcOutcome = 'retry';
        }

        if (rpcOutcome === 'failed') {
          // Rechazo de la base con el cajero presente: se muestra el error y la venta no se registra.
          console.error("Error processing sale online:", rpcFailure);
          throw rpcFailure;
        }

        if (rpcOutcome === 'retry') {
          console.error("Error processing sale online:", rpcFailure);
          useSyncStore.getState().addToQueue(salePayload);
          await registerBackgroundSync();
          notifyWarning("Red inestable: Venta guardada offline para reintento automático.");
        } else {
          // Revalidación silenciosa tras éxito (evita llamadas de red HTTP innecesarias en caliente)
          queryClient.invalidateQueries({ queryKey: ['products-grid'], refetchType: 'none' });
          queryClient.invalidateQueries({ queryKey: ['tank-status'], refetchType: 'none' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-v2-raw'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
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
    } finally {
      saleInFlightRef.current = false;
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
          event: 'UPDATE',
          schema: 'public',
          table: 'store_stock',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const updatedStock = payload.new as { product_id: string; qty: number };
          queryClient.setQueryData(['products-grid', storeId], (oldData: any) => {
            if (!oldData || !oldData.products) return oldData;
            return {
              ...oldData,
              products: oldData.products.map((prod: any) =>
                prod.id === updatedStock.product_id ? { ...prod, stock: updatedStock.qty } : prod
              )
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_items',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const updatedItem = payload.new as { id: string; stock: number };
          queryClient.setQueryData(['products-grid', storeId], (oldData: any) => {
            if (!oldData || !oldData.products) return oldData;
            return {
              ...oldData,
              products: oldData.products.map((prod: any) => {
                const hasIngredient = prod.recipes?.some(
                  (r: any) => r.inventory_item_id === updatedItem.id
                );
                if (hasIngredient) {
                  return { ...prod, mixtureStock: updatedItem.stock };
                }
                return prod;
              })
            };
          });
        }
      )
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  return {
    isProcessing,
    isSyncing,
    isOnline,
    pendingOrdersCount,
    pendingOrders,
    failedOrders,
    retryFailedOrder,
    processSale,
    handleSync,
    checkPendingOrders
  };
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseRpc } from "@/integrations/supabase/types-extensions";
import { useAuth } from "@/context/AuthContext";
import { useTurn } from "@/hooks/useTurn";
import { offlineService, OfflineOrder } from "@/lib/OfflineService";
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
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<OfflineOrder[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPendingOrders();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingOrders = async () => {
    const pending = await offlineService.getPendingOrders();
    setPendingOrders(pending);
    setPendingOrdersCount(pending.length);
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
      if (!storeId) throw new Error("No se pudo obtener la información de la tienda.");

      if (!activeTurn || activeTurn.status === 'paused') {
        notifyCritical("Debes tener un turno activo para procesar ventas.");
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

      let orderId: string | null = null;

      if (isOnline) {
        const { data: orderWithId, error: rpcError } = await supabaseRpc<string>('process_sale', {
          sale_data: salePayload as Record<string, unknown>
        });

        if (rpcError) throw rpcError;
        orderId = orderWithId ?? null;
      } else {
        const offlineOrder = await offlineService.saveOfflineOrder(salePayload);
        orderId = offlineOrder.id;
        notifyInfo("Venta guardada localmente (Modo Offline)");
        checkPendingOrders();
      }

      const orderData = {
        id: orderId,
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

      notifyInfo("¡Venta procesada exitosamente!");
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products-grid'] }),
        queryClient.invalidateQueries({ queryKey: ['tank-status'] })
      ]);
      
      return orderData;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error processing sale:", error);
      notifyCritical("Error al procesar la venta: " + msg);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      notifyCritical("No hay conexión a internet para sincronizar.");
      return;
    }

    setIsProcessing(true);
    try {
      const pending = await offlineService.getPendingOrders();
      if (pending.length === 0) {
        notifyInfo("No hay pedidos pendientes.");
        return;
      }

      let successCount = 0;
      for (const order of pending) {
        try {
          const { error } = await supabaseRpc('process_sale', {
            sale_data: order.payload as Record<string, unknown>
          });
          if (!error) {
            await offlineService.markOrderSynced(order.id);
            successCount++;
          }
        } catch (e) {
          console.error("Error syncing order:", order.id, e);
        }
      }

      await checkPendingOrders();
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

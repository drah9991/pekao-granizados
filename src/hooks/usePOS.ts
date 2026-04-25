import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useTurn } from "@/hooks/useTurn";
import { offlineService } from "@/lib/OfflineService";
import { useAlerts } from "@/hooks/useAlerts";
import { useQueryClient } from "@tanstack/react-query";
import { PaymentMethod } from "@/components/pos/PaymentDialog";

export function usePOS() {
  const { user, storeId } = useAuth();
  const queryClient = useQueryClient();
  const { activeTurn } = useTurn();
  const { notifyInfo, notifyWarning, notifyCritical } = useAlerts();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

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
    setPendingOrdersCount(pending.length);
  };

  const processSale = async (
    cart: any[],
    saleTotal: number,
    saleSubtotal: number,
    saleDiscountAmount: number,
    saleCustomer: any,
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

      const mappedItems = cart.flatMap(item => {
        const toppingsPrice = item.toppings?.reduce((sum: number, t: any) => sum + t.price, 0) || 0;
        const baseItemPrice = item.price - toppingsPrice;

        const mainItem = {
          product_id: item.productId,
          quantity: item.quantity,
          price: baseItemPrice,
          name: item.name,
          size: item.size || null,
          size_multiplier: item.sizeMultiplier || 1,
          base_volume: item.baseVolume || 4
        };

        const toppings = (item.toppings || []).map((topping: any) => ({
          product_id: topping.id,
          quantity: item.quantity,
          price: topping.price,
          name: `Topping: ${topping.name}`,
          size: null,
          size_multiplier: 1
        }));

        return [mainItem, ...toppings];
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

      let orderId: any;

      if (isOnline) {
        const { data: orderWithId, error: rpcError } = await (supabase as any).rpc('process_sale', {
          sale_data: salePayload
        });

        if (rpcError) throw rpcError;
        orderId = orderWithId;
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

      notifyInfo("¡Venta procesada exitosamente!");
      queryClient.invalidateQueries({ queryKey: ['products-grid'] });
      
      return orderData;
    } catch (error: any) {
      console.error("Error processing sale:", error);
      notifyCritical("Error al procesar la venta: " + error.message);
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
          const { error } = await (supabase as any).rpc('process_sale', {
            sale_data: order.payload
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
      }
    } catch (error: any) {
      notifyCritical("Error durante la sincronización: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    isOnline,
    pendingOrdersCount,
    processSale,
    handleSync,
    checkPendingOrders
  };
}

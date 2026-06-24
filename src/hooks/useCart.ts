import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore";
import { useAlerts } from "@/hooks/useAlerts";
import type { CartItem, Product, Size } from "@/lib/pos-types";
import { useAuth } from "@/context/AuthContext";

export const useCart = () => {
  const { notifyCritical } = useAlerts();
  
  const cart = useCartStore((state) => state.cart);
  const discount = useCartStore((state) => state.discount);
  const discountType = useCartStore((state) => state.discountType);
  const selectedCustomer = useCartStore((state) => state.selectedCustomer);
  const availableSizes = useCartStore((state) => state.availableSizes);
  const availableToppings = useCartStore((state) => state.availableToppings);
  
  const setDynamicData = useCartStore((state) => state.setDynamicData);
  const setCart = useCartStore((state) => state.setCart);
  const setDiscount = useCartStore((state) => state.setDiscount);
  const setDiscountType = useCartStore((state) => state.setDiscountType);
  const setSelectedCustomer = useCartStore((state) => state.setSelectedCustomer);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getDiscountAmount = useCartStore((state) => state.getDiscountAmount);
  const getTotal = useCartStore((state) => state.getTotal);
  const storeAddToCart = useCartStore((state) => state.addToCart);
  const storeUpdateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const storeUpdateItemCustomization = useCartStore((state) => state.updateItemCustomization);
  const resetCart = useCartStore((state) => state.resetCart);
  const restoreLastCart = useCartStore((state) => state.restoreLastCart);

  const { storeId } = useAuth();

  useEffect(() => {
    if (storeId) {
      fetchDynamicData(storeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const fetchDynamicData = async (storeId: string) => {
    try {
      const [sizesResult, toppingsResult, typesResult, rulesResult] = await Promise.all([
        supabase
          .from('sizes')
          .select('*')
          .eq('store_id', storeId)
          .order('multiplier', { ascending: true }),
        supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .eq('type', 'topping')
          .eq('active', true)
          .order('name', { ascending: true }),
        supabase
          .from('product_types_config')
          .select('*')
          .eq('active', true),
        supabase
          .from('pricing_rules')
          .select('*')
          .eq('store_id', storeId)
          .eq('active', true)
      ]);

      if (sizesResult.error) throw sizesResult.error;
      if (toppingsResult.error) throw toppingsResult.error;
      if (typesResult.error) throw typesResult.error;
      if (rulesResult.error) throw rulesResult.error;

      setDynamicData(
        sizesResult.data || [],
        toppingsResult.data as Product[] || [],
        typesResult.data || [],
        rulesResult.data || []
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      console.error("Error fetching dynamic data in parallel:", error);
      toast.error("Error al cargar datos dinámicos: " + msg);
    }
  };

  const addToCart = useCallback((product: Product, selectedSizeId: string, selectedToppingIds: string[], customized: boolean = false, quantity: number = 1, discountMessage?: string) => {
    storeAddToCart(product, selectedSizeId, selectedToppingIds, customized, quantity, notifyCritical, discountMessage);
  }, [storeAddToCart, notifyCritical]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    storeUpdateQuantity(id, delta, notifyCritical);
  }, [storeUpdateQuantity, notifyCritical]);

  const updateItemCustomization = useCallback((itemId: string, selectedSizeId: string, selectedToppingIds: string[]) => {
    storeUpdateItemCustomization(itemId, selectedSizeId, selectedToppingIds, notifyCritical);
  }, [storeUpdateItemCustomization, notifyCritical]);

  return {
    cart,
    setCart,
    addToCart,
    updateQuantity,
    removeItem,
    updateItemCustomization,
    subtotal: getSubtotal(),
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    discountAmount: getDiscountAmount(),
    total: getTotal(),
    resetCart,
    restoreLastCart,
    selectedCustomer,
    setSelectedCustomer,
    availableSizes,
    availableToppings
  };
};
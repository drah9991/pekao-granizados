import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore";
import { useAlerts } from "@/hooks/useAlerts";
import type { CartItem, Product, Size } from "@/lib/pos-types";
import { useAuth } from "@/context/AuthContext";

export const useCart = () => {
  const { notifyCritical } = useAlerts();
  
  const {
    cart,
    discount,
    discountType,
    selectedCustomer,
    availableSizes,
    availableToppings,
    setDynamicData,
    setCart,
    setDiscount,
    setDiscountType,
    setSelectedCustomer,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    addToCart: storeAddToCart,
    updateQuantity: storeUpdateQuantity,
    removeItem,
    updateItemCustomization: storeUpdateItemCustomization,
    resetCart,
    restoreLastCart
  } = useCartStore();

  const { storeId } = useAuth();

  useEffect(() => {
    if (storeId) {
      fetchDynamicData(storeId);
    }
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
    } catch (error: any) {
      console.error("Error fetching dynamic data in parallel:", error);
      toast.error("Error al cargar datos dinámicos: " + error.message);
    }
  };

  const addToCart = useCallback((product: Product, selectedSizeId: string, selectedToppingIds: string[], customized: boolean = false, quantity: number = 1) => {
    storeAddToCart(product, selectedSizeId, selectedToppingIds, customized, quantity, notifyCritical);
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
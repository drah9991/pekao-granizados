import { useState, useEffect, useMemo } from "react";
import { CartItem, Product, Size } from "@/lib/pos-types"; // Topping interface removed
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

// Utility function to ensure cart items are valid and clean them up
const cleanCartItems = (cartItems: CartItem[]): CartItem[] => {
  return cartItems.filter(item => {
    if (
      !item || 
      typeof item !== 'object' ||
      typeof item.id !== 'string' || 
      typeof item.price !== 'number' ||
      isNaN(item.price) ||
      typeof item.quantity !== 'number' ||
      isNaN(item.quantity) ||
      item.quantity < 0
    ) {
      console.warn('Removing invalid cart item:', item);
      return false;
    }
    return true;
  }).map(item => {
    const newItem = { ...item };
    if (newItem.toppings) {
      newItem.toppings = newItem.toppings.filter(t => t && typeof t.price === 'number' && t.name);
    }
    return newItem;
  });
};

export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [availableSizes, setAvailableSizes] = useState<Tables<'sizes'>[]>([]);
  const [availableToppings, setAvailableToppings] = useState<Product[]>([]);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);

  useEffect(() => {
    // Clean cart on initial load to ensure data consistency
    setCart(prevCart => cleanCartItems(prevCart));
    fetchUserStoreIdAndData();
  }, []);

  const fetchUserStoreIdAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado.");
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (profile?.store_id) {
        setUserStoreId(profile.store_id);
        fetchDynamicData(profile.store_id);
      } else {
        toast.warning("No se encontró un ID de tienda para el usuario. Algunas funcionalidades podrían no estar disponibles.");
      }
    } catch (error: any) {
      console.error("Error fetching user's store ID:", error);
      toast.error("Error al obtener ID de tienda: " + error.message);
    }
  };

  const fetchDynamicData = async (storeId: string) => {
    try {
      // Fetch sizes
      const { data: sizesData, error: sizesError } = await supabase
        .from('sizes')
        .select('*')
        .eq('store_id', storeId)
        .order('multiplier', { ascending: true });

      if (sizesError) throw sizesError;
      setAvailableSizes(sizesData || []);

      // Fetch toppings (products of type 'topping')
      const { data: toppingsData, error: toppingsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('type', 'topping')
        .eq('active', true)
        .order('name', { ascending: true });

      if (toppingsError) throw toppingsError;
      setAvailableToppings(toppingsData as Product[] || []);

    } catch (error: any) {
      console.error("Error fetching dynamic data:", error);
      toast.error("Error al cargar datos dinámicos: " + error.message);
    }
  };

  const addToCart = (
    product: Product,
    selectedSizeId: string,
    selectedToppingIds: string[],
    customized: boolean = false
  ) => {
    const size = availableSizes.find(s => s.id === selectedSizeId);
    const validToppings = availableToppings.filter(t => selectedToppingIds.includes(t.id));
    
    const basePrice = product.price * (size?.multiplier || 1);
    const toppingsPrice = validToppings.reduce((sum, t) => sum + t.price, 0);
    const finalPrice = basePrice + toppingsPrice;

    const customizationId = customized ? `${product.id}-${Date.now()}` : product.id;
    
    const newItem: CartItem = {
      id: customizationId,
      name: product.name,
      price: finalPrice,
      quantity: 1,
      size: size?.name,
      toppings: validToppings.length > 0 ? validToppings : undefined,
      customizationId,
    };

    setCart(prevCart => cleanCartItems([...prevCart, newItem]));
    toast.success("Producto agregado al carrito");
  };

  const updateQuantity = (id: string, delta: number) => {
    const updatedCart = cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0);
    
    setCart(cleanCartItems(updatedCart));
  };

  const removeItem = (id: string) => {
    setCart(cleanCartItems(cart.filter(item => item.id !== id)));
  };

  const subtotal = useMemo(() => {
    return cleanCartItems(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return discountType === "percent" ? (subtotal * discount / 100) : discount;
  }, [subtotal, discount, discountType]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const resetCart = () => {
    setCart([]);
    setDiscount(0);
    setDiscountType("percent");
  };

  return {
    cart: cleanCartItems(cart),
    setCart,
    addToCart,
    updateQuantity,
    removeItem,
    subtotal,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    discountAmount,
    total,
    resetCart,
  };
};
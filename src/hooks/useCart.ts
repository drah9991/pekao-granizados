import { useState, useEffect, useMemo } from "react";
import { CartItem, Product, Size } from "@/lib/pos-types"; // Topping interface removed
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Customer } from "@/components/pos/CustomerSelection";

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
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

      // Fetch active dynamic pricing rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('store_id', storeId)
        .eq('active', true);

      if (rulesError) throw rulesError;
      setPricingRules(rulesData || []);

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
    const size = selectedSizeId ? availableSizes.find(s => s.id === selectedSizeId) : null;
    const validToppings = availableToppings.filter(t => selectedToppingIds.includes(t.id));

    let basePrice = product.price * (size?.multiplier || 1);
    let originalPrice = basePrice;
    let discountMessage = undefined;

    // Apply Dynamic Pricing Rules
    if (pricingRules.length > 0) {
      const now = new Date();
      const jsDay = now.getDay();
      const currentDay = jsDay === 0 ? 7 : jsDay; // Convert to 1-7 (Mon-Sun)
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

      // Find all applicable rules for this product right now
      const applicableRules = pricingRules.filter(rule => {
        // Check day
        if (rule.days_of_week && rule.days_of_week.length > 0 && !rule.days_of_week.includes(currentDay)) return false;
        
        // Check time
        if (rule.type === 'time_based' && rule.start_time && rule.end_time) {
          if (currentTime < rule.start_time || currentTime > rule.end_time) return false;
        }

        // Check target (all, category, product)
        if (rule.target_type === 'category' && product.category !== rule.target_id) return false;
        if (rule.target_type === 'product' && product.id !== rule.target_id) return false;

        return true;
      });

      // If rules apply, we pick the one that gives the best discount to the customer
      if (applicableRules.length > 0) {
        let bestDiscountedPrice = basePrice;
        let bestRule = null;

        for (const rule of applicableRules) {
          let discountedPrice = basePrice;
          if (rule.discount_type === 'percentage') {
            discountedPrice = basePrice * (1 - rule.discount_value / 100);
          } else if (rule.discount_type === 'fixed') {
            discountedPrice = Math.max(0, basePrice - rule.discount_value);
          }

          if (discountedPrice < bestDiscountedPrice) {
            bestDiscountedPrice = discountedPrice;
            bestRule = rule;
          }
        }

        if (bestRule && bestDiscountedPrice < basePrice) {
          basePrice = bestDiscountedPrice;
          discountMessage = bestRule.name;
        }
      }
    }

    const toppingsPrice = validToppings.reduce((sum, t) => sum + t.price, 0);
    const finalPrice = basePrice + toppingsPrice;

    const customizationId = customized ? `${product.id}-${Date.now()}` : product.id;

    const newItem: CartItem = {
      id: customizationId,
      name: product.name,
      productId: product.id,
      price: finalPrice,
      quantity: 1,
      size: size?.name,
      sizeMultiplier: size?.multiplier || 1, 
      toppings: validToppings.length > 0 ? validToppings : undefined,
      customizationId,
      originalPrice: originalPrice !== basePrice ? originalPrice + toppingsPrice : undefined,
      discountMessage,
    };

    setCart(prevCart => cleanCartItems([...prevCart, newItem]));
    if (discountMessage) {
      toast.success(`Producto agregado con descuento: ${discountMessage}`);
    } else {
      toast.success("Producto agregado al carrito");
    }
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
    setSelectedCustomer(null);
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
    selectedCustomer,
    setSelectedCustomer
  };
};
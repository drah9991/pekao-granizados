import { useState, useEffect, useMemo } from "react";
import { CartItem, Product, Size } from "@/lib/pos-types"; // Topping interface removed
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Customer } from "@/components/pos/CustomerSelection";
import { useAlerts } from "@/hooks/useAlerts";

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
    if (!item.toppings) return item;

    // Only recreate if there's actually invalid toppings
    const validToppings = item.toppings.filter(t => t && typeof t.price === 'number' && t.name);
    if (validToppings.length !== item.toppings.length) {
      return { ...item, toppings: validToppings };
    }
    return item;
  });
};

export const useCart = () => {
  const { notifyCritical } = useAlerts();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [availableSizes, setAvailableSizes] = useState<Tables<'sizes'>[]>([]);
  const [availableToppings, setAvailableToppings] = useState<Product[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [userStoreId, setUserStoreId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lastRemovedCart, setLastRemovedCart] = useState<{
    items: CartItem[];
    discount: number;
    discountType: "percent" | "fixed";
    customer: Customer | null;
  } | null>(null);

  useEffect(() => {
    // Clean cart on initial load to ensure data consistency
    setCart(prevCart => cleanCartItems(prevCart));
    fetchUserStoreIdAndData();
  }, []);

  const restoreLastCart = () => {
    if (lastRemovedCart) {
      setCart(lastRemovedCart.items);
      setDiscount(lastRemovedCart.discount);
      setDiscountType(lastRemovedCart.discountType);
      setSelectedCustomer(lastRemovedCart.customer);
      setLastRemovedCart(null);
      toast.success("Carrito restaurado");
    }
  };

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

      // Fetch product types config
      const { data: typesData } = await supabase.from('product_types_config').select('*').eq('active', true);
      setProductTypes(typesData || []);

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
    customized: boolean = false,
    quantity: number = 1
  ) => {
    const typeCfg = productTypes.find(t => t.code === product.type);
    const trackMixture = typeCfg?.track_mixture_inventory || product.type === 'granizado' || product.category === 'Granizado';

    // Eliminamos el bloqueo obligatorio por receta para permitir ventas 
    // basadas solo en el stock del producto si así se desea.

    const baseVol = Number(product.base_volume) || 4;
    const currentSize = selectedSizeId ? availableSizes.find(s => s.id === selectedSizeId) : null;
    const itemMultiplier = currentSize?.multiplier || 1;
    const OZ_TO_ML = 29.57;

    if (trackMixture && product.mixtureStock !== undefined && product.mixtureStock > 0) {
      const requestedMl = baseVol * itemMultiplier * OZ_TO_ML * quantity;
      const currentMlInCart = cart
        .filter(i => i.productId === product.id)
        .reduce((sum, i) => sum + (i.quantity * (i.baseVolume || 4) * (i.sizeMultiplier || 1) * OZ_TO_ML), 0);

      if (currentMlInCart + requestedMl > product.mixtureStock) {
        notifyCritical(`No hay suficiente mezcla de ${product.name} disponible para ${quantity} porciones.`);
        return;
      }
    } else if (!trackMixture && product.stock !== undefined) {
      const currentQty = cart.reduce((sum, i) => i.productId === product.id ? sum + i.quantity : sum, 0);
      if ((currentQty + quantity) > product.stock) {
        notifyCritical(`Stock insuficiente de ${product.name}`);
        return;
      }
    }

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

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.id === customizationId);
      
      if (existingItemIndex >= 0 && !customized) {
        const updatedCart = [...prevCart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity
        };
        return cleanCartItems(updatedCart);
      }

      const newItem: CartItem = {
        id: customizationId,
        name: product.name,
        productId: product.id,
        price: finalPrice,
        quantity: quantity,
        size: size?.name,
        sizeMultiplier: size?.multiplier || 1, 
        toppings: validToppings.length > 0 ? validToppings : undefined,
        customizationId,
        originalPrice: originalPrice !== basePrice ? originalPrice + toppingsPrice : undefined,
        discountMessage,
        maxStock: product.stock,
        isGranizado: trackMixture,
        mixtureStock: product.mixtureStock,
        baseVolume: Number(product.base_volume) || 4
      };

      return cleanCartItems([...prevCart, newItem]);
    });
    if (discountMessage) {
      toast.success(`Producto agregado con descuento: ${discountMessage}`);
    } else {
      toast.success("Producto agregado al carrito");
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (item && delta > 0) {
       const OZ_TO_ML = 29.57;
       if (item.isGranizado && item.mixtureStock !== undefined && item.mixtureStock > 0) {
         const requestedNewQty = item.quantity + delta;
         const currentMlInCartTotal = cart
           .filter(i => i.productId === item.productId)
           .reduce((sum, i) => {
             const qty = i.id === id ? requestedNewQty : i.quantity;
             return sum + (qty * (i.baseVolume || 4) * (i.sizeMultiplier || 1) * OZ_TO_ML);
           }, 0);

         if (currentMlInCartTotal > item.mixtureStock) {
           notifyCritical(`Límite de mezcla alcanzado para este sabor.`);
           return;
         }
       } else if (item.maxStock !== undefined) {
         const currentTotalWithNew = cart.reduce((sum, i) => {
           const qty = i.id === id ? i.quantity + delta : i.quantity;
           return i.productId === item.productId ? sum + qty : sum;
         }, 0);

         if (currentTotalWithNew > item.maxStock) {
           notifyCritical(`Límite de stock alcanzado (${item.maxStock})`);
           return;
         }
       }
    }

    const updatedCart = cart.map(cartItem => {
      if (cartItem.id === id) {
        const newQty = cartItem.quantity + delta;
        return newQty > 0 ? { ...cartItem, quantity: newQty } : cartItem;
      }
      return cartItem;
    }).filter(cartItem => cartItem.quantity > 0);

    setCart(cleanCartItems(updatedCart));
  };

  const removeItem = (id: string) => {
    setCart(cleanCartItems(cart.filter(item => item.id !== id)));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return discountType === "percent" ? (subtotal * discount / 100) : discount;
  }, [subtotal, discount, discountType]);

  const total = useMemo(() => {
    return Math.max(0, Math.round(subtotal - discountAmount));
  }, [subtotal, discountAmount]);

  const resetCart = () => {
    if (cart.length > 0) {
      setLastRemovedCart({
        items: [...cart],
        discount,
        discountType,
        customer: selectedCustomer
      });
    }
    setCart([]);
    setDiscount(0);
    setDiscountType("percent");
    setSelectedCustomer(null);
  };

  return {
    cart, // ⚡ Bolt: Removed redundant cleanCartItems call on every render, as cart is already clean in state
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
    restoreLastCart,
    selectedCustomer,
    setSelectedCustomer
  };
};
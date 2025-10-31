import { useState, useEffect, useMemo } from "react";
import { CartItem, Topping, Product, Size } from "@/lib/pos-types";
import { availableToppings, sizes } from "@/lib/pos-data";
import { toast } from "sonner";

// Utility function to ensure cart items are valid and clean them up
const cleanCartItems = (cartItems: CartItem[]): CartItem[] => {
  return cartItems.filter(item => {
    // Ensure item is an object, not null/undefined, and has valid id, price, and quantity
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

// The 'products' prop was unused in this hook, so it's removed for cleaner code.
export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  useEffect(() => {
    // Clean cart on initial load to ensure data consistency
    setCart(prevCart => cleanCartItems(prevCart));
  }, []);

  const addToCart = (
    product: Product,
    selectedSizeId: string,
    selectedToppingIds: string[],
    customized: boolean = false
  ) => {
    const size = sizes.find(s => s.id === selectedSizeId);
    const validToppings = availableToppings.filter(t => selectedToppingIds.includes(t.id));
    
    const basePrice = product.price * (size?.multiplier || 1);
    const toppingsPrice = validToppings.reduce((sum, t) => sum + t.price, 0);
    const finalPrice = basePrice + toppingsPrice;

    // Use a unique ID for customized items to allow multiple customizations of the same product
    const customizationId = customized ? `${product.id}-${Date.now()}` : product.id;
    
    const newItem: CartItem = {
      id: customizationId,
      name: product.name,
      price: finalPrice,
      quantity: 1,
      size: size?.name,
      toppings: validToppings.length > 0 ? validToppings : undefined,
      customizationId, // Keep track of the customization ID
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
    }).filter(item => item.quantity > 0); // Remove items with quantity 0 or less
    
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
    cart: cleanCartItems(cart), // Always return a clean cart
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
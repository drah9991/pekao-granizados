import { useState, useEffect, useMemo } from "react";
import { CartItem, Topping, Product, Size } from "@/lib/pos-types";
import { availableToppings, sizes } from "@/lib/pos-data";
import { toast } from "sonner";

interface UseCartProps {
  products: Product[];
}

export const useCart = ({ products }: UseCartProps) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");

  // Cleanup function to remove null/invalid items from cart
  const cleanCart = (cartItems: CartItem[]): CartItem[] => {
    return cartItems.filter(item => {
      if (
        item === null ||
        typeof item !== 'object' ||
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

  useEffect(() => {
    setCart(prevCart => cleanCart(prevCart));
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

    setCart(prevCart => cleanCart([...prevCart, newItem]));
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
    
    setCart(cleanCart(updatedCart));
  };

  const removeItem = (id: string) => {
    setCart(cleanCart(cart.filter(item => item.id !== id)));
  };

  const subtotal = useMemo(() => {
    return cleanCart(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
    cart: cleanCart(cart), // Always return a clean cart
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
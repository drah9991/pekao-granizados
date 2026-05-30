import { create } from "zustand";
import type { CartItem, Product, Size } from "@/lib/pos-types";
import type { Customer } from "@/components/pos/CustomerSelection";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

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

export interface CartStoreState {
  cart: CartItem[];
  discount: number;
  discountType: "percent" | "fixed";
  selectedCustomer: Customer | null;
  lastRemovedCart: {
    items: CartItem[];
    discount: number;
    discountType: "percent" | "fixed";
    customer: Customer | null;
  } | null;
  
  // Dynamic Data caching for logic
  availableSizes: Tables<'sizes'>[];
  availableToppings: Product[];
  productTypes: any[];
  pricingRules: any[];

  // Setters
  setDynamicData: (sizes: Tables<'sizes'>[], toppings: Product[], types: any[], rules: any[]) => void;
  setCart: (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => void;
  setDiscount: (discount: number) => void;
  setDiscountType: (type: "percent" | "fixed") => void;
  setSelectedCustomer: (customer: Customer | null) => void;

  // Derived getters
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTotal: () => number;

  // Actions
  addToCart: (
    product: Product,
    selectedSizeId: string,
    selectedToppingIds: string[],
    customized?: boolean,
    quantity?: number,
    notifyCritical?: (msg: string) => void
  ) => void;
  updateQuantity: (id: string, delta: number, notifyCritical?: (msg: string) => void) => void;
  removeItem: (id: string) => void;
  updateItemCustomization: (
    itemId: string,
    selectedSizeId: string,
    selectedToppingIds: string[],
    notifyCritical?: (msg: string) => void
  ) => void;
  resetCart: () => void;
  restoreLastCart: () => void;
}

export const useCartStore = create<CartStoreState>((set, get) => ({
  cart: [],
  discount: 0,
  discountType: "percent",
  selectedCustomer: null,
  lastRemovedCart: null,

  availableSizes: [],
  availableToppings: [],
  productTypes: [],
  pricingRules: [],

  setDynamicData: (sizes, toppings, types, rules) => set({
    availableSizes: sizes,
    availableToppings: toppings,
    productTypes: types,
    pricingRules: rules
  }),

  setCart: (updater) => set((state) => ({
    cart: cleanCartItems(typeof updater === 'function' ? updater(state.cart) : updater)
  })),
  setDiscount: (discount) => set({ discount }),
  setDiscountType: (discountType) => set({ discountType }),
  setSelectedCustomer: (selectedCustomer) => set({ selectedCustomer }),

  getSubtotal: () => cleanCartItems(get().cart).reduce((sum, item) => sum + (item.price * item.quantity), 0),
  
  getDiscountAmount: () => {
    const state = get();
    const subtotal = state.getSubtotal();
    return state.discountType === "percent" ? (subtotal * state.discount / 100) : state.discount;
  },

  getTotal: () => {
    const state = get();
    return Math.max(0, Math.round(state.getSubtotal() - state.getDiscountAmount()));
  },

  addToCart: (product, selectedSizeId, selectedToppingIds, customized = false, quantity = 1, notifyCritical) => {
    const state = get();
    const cart = state.cart;
    const typeCfg = state.productTypes.find(t => t.code === product.type);
    const trackMixture = typeCfg?.track_mixture_inventory || product.type === 'granizado' || product.category === 'Granizado';

    const productNeedsSize = product.type !== 'sachet' && product.type !== 'sweet';
    let sizeId = selectedSizeId;
    if (!sizeId && productNeedsSize && state.availableSizes.length > 0) {
      sizeId = state.availableSizes[0].id;
    }

    const baseVol = Number(product.base_volume) || 4;
    const currentSize = sizeId ? state.availableSizes.find(s => s.id === sizeId) : null;
    const itemMultiplier = currentSize?.multiplier || 1;
    const OZ_TO_ML = 29.57;

    if (trackMixture && product.mixtureStock !== undefined && product.mixtureStock > 0) {
      const requestedMl = baseVol * itemMultiplier * OZ_TO_ML * quantity;
      const currentMlInCart = cart
        .filter(i => i.productId === product.id)
        .reduce((sum, i) => sum + (i.quantity * (i.baseVolume || 4) * (i.sizeMultiplier || 1) * OZ_TO_ML), 0);

      if (currentMlInCart + requestedMl > product.mixtureStock) {
        if (notifyCritical) notifyCritical(`No hay suficiente mezcla de ${product.name} disponible para ${quantity} porciones.`);
        return;
      }
    } else if (!trackMixture && product.stock !== undefined) {
      const currentQty = cart.reduce((sum, i) => i.productId === product.id ? sum + i.quantity : sum, 0);
      if ((currentQty + quantity) > product.stock) {
        if (notifyCritical) notifyCritical(`Stock insuficiente de ${product.name}`);
        return;
      }
    }

    const size = sizeId ? state.availableSizes.find(s => s.id === sizeId) : null;
    const validToppings = state.availableToppings.filter(t => selectedToppingIds.includes(t.id));

    let basePrice = product.price * (size?.multiplier || 1);
    const originalPrice = basePrice;
    let discountMessage: string | undefined = undefined;

    if (state.pricingRules.length > 0) {
      const now = new Date();
      const jsDay = now.getDay();
      const currentDay = jsDay === 0 ? 7 : jsDay;
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

      const applicableRules = state.pricingRules.filter(rule => {
        if (rule.days_of_week && rule.days_of_week.length > 0 && !rule.days_of_week.includes(currentDay)) return false;
        if (rule.type === 'time_based' && rule.start_time && rule.end_time) {
          if (currentTime < rule.start_time || currentTime > rule.end_time) return false;
        }
        if (rule.target_type === 'category' && product.category !== rule.target_id) return false;
        if (rule.target_type === 'product' && product.id !== rule.target_id) return false;
        return true;
      });

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

    const isConfigurable = product.type !== 'sachet' && product.type !== 'sweet';
    const customizationId = (customized || isConfigurable) ? `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : product.id;

    set(state => {
      const existingItemIndex = state.cart.findIndex(item => item.id === customizationId);
      
      if (existingItemIndex >= 0 && !customized) {
        const updatedCart = [...state.cart];
        updatedCart[existingItemIndex] = {
          ...updatedCart[existingItemIndex],
          quantity: updatedCart[existingItemIndex].quantity + quantity
        };
        return { cart: cleanCartItems(updatedCart) };
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
        baseVolume: Number(product.base_volume) || 4,
        productPrice: product.price,
        productType: product.type,
        productCategory: product.category
      };

      return { cart: cleanCartItems([...state.cart, newItem]) };
    });

    if (discountMessage) {
      toast.success(`Producto agregado con descuento: ${discountMessage}`);
    } else {
      toast.success("Producto agregado al carrito");
    }
  },

  updateQuantity: (id, delta, notifyCritical) => {
    const state = get();
    const cart = state.cart;
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
           if (notifyCritical) notifyCritical(`Límite de mezcla alcanzado para este sabor.`);
           return;
         }
       } else if (item.maxStock !== undefined) {
         const currentTotalWithNew = cart.reduce((sum, i) => {
           const qty = i.id === id ? i.quantity + delta : i.quantity;
           return i.productId === item.productId ? sum + qty : sum;
         }, 0);

         if (currentTotalWithNew > item.maxStock) {
           if (notifyCritical) notifyCritical(`Límite de stock alcanzado (${item.maxStock})`);
           return;
         }
       }
    }

    set(state => {
      const updatedCart = state.cart.map(cartItem => {
        if (cartItem.id === id) {
          const newQty = cartItem.quantity + delta;
          return newQty > 0 ? { ...cartItem, quantity: newQty } : cartItem;
        }
        return cartItem;
      }).filter(cartItem => cartItem.quantity > 0);
      return { cart: cleanCartItems(updatedCart) };
    });
  },

  removeItem: (id) => {
    set(state => ({ cart: cleanCartItems(state.cart.filter(item => item.id !== id)) }));
  },

  updateItemCustomization: (itemId, selectedSizeId, selectedToppingIds, notifyCritical) => {
    set(state => {
      const updatedCart = state.cart.map(item => {
        if (item.id !== itemId) return item;

        const productPrice = item.productPrice ?? (item.sizeMultiplier && item.sizeMultiplier > 0 ? item.price / item.sizeMultiplier : item.price);
        const productType = item.productType || (item.isGranizado ? 'granizado' : 'unit');
        const productCategory = item.productCategory || null;

        const size = selectedSizeId ? state.availableSizes.find(s => s.id === selectedSizeId) : null;
        const validToppings = state.availableToppings.filter(t => selectedToppingIds.includes(t.id));

        const typeCfg = state.productTypes.find(t => t.code === productType);
        const trackMixture = typeCfg?.track_mixture_inventory || productType === 'granizado' || productCategory === 'Granizado';
        const baseVol = Number(item.baseVolume) || 4;
        const itemMultiplier = size?.multiplier || 1;
        const OZ_TO_ML = 29.57;

        if (trackMixture && item.mixtureStock !== undefined && item.mixtureStock > 0) {
          const requestedMl = baseVol * itemMultiplier * OZ_TO_ML * item.quantity;
          const currentMlInCart = state.cart
            .filter(i => i.productId === item.productId && i.id !== itemId)
            .reduce((sum, i) => sum + (i.quantity * (i.baseVolume || 4) * (i.sizeMultiplier || 1) * OZ_TO_ML), 0);

          if (currentMlInCart + requestedMl > item.mixtureStock) {
            if (notifyCritical) notifyCritical(`No hay suficiente mezcla disponible para este tamaño.`);
            return item;
          }
        }

        let basePrice = productPrice * (size?.multiplier || 1);
        const originalPrice = basePrice;
        let discountMessage: string | undefined = undefined;

        if (state.pricingRules.length > 0) {
          const now = new Date();
          const jsDay = now.getDay();
          const currentDay = jsDay === 0 ? 7 : jsDay;
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

          const applicableRules = state.pricingRules.filter(rule => {
            if (rule.days_of_week && rule.days_of_week.length > 0 && !rule.days_of_week.includes(currentDay)) return false;
            if (rule.type === 'time_based' && rule.start_time && rule.end_time) {
              if (currentTime < rule.start_time || currentTime > rule.end_time) return false;
            }
            if (rule.target_type === 'category' && productCategory !== rule.target_id) return false;
            if (rule.target_type === 'product' && item.productId !== rule.target_id) return false;
            return true;
          });

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

        return {
          ...item,
          price: finalPrice,
          size: size?.name || undefined,
          sizeMultiplier: size?.multiplier || 1,
          toppings: validToppings.length > 0 ? validToppings : undefined,
          originalPrice: originalPrice !== basePrice ? originalPrice + toppingsPrice : undefined,
          discountMessage
        };
      });
      return { cart: cleanCartItems(updatedCart) };
    });
    
    toast.success("Personalización actualizada");
  },

  resetCart: () => {
    set(state => {
      if (state.cart.length > 0) {
        return {
          lastRemovedCart: {
            items: [...state.cart],
            discount: state.discount,
            discountType: state.discountType,
            customer: state.selectedCustomer
          },
          cart: [],
          discount: 0,
          discountType: "percent",
          selectedCustomer: null
        };
      }
      return {
        cart: [],
        discount: 0,
        discountType: "percent",
        selectedCustomer: null
      };
    });
  },

  restoreLastCart: () => {
    set(state => {
      if (state.lastRemovedCart) {
        toast.success("Carrito restaurado");
        return {
          cart: state.lastRemovedCart.items,
          discount: state.lastRemovedCart.discount,
          discountType: state.lastRemovedCart.discountType,
          selectedCustomer: state.lastRemovedCart.customer,
          lastRemovedCart: null
        };
      }
      return state;
    });
  }
}));

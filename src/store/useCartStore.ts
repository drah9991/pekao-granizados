import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, Size } from "@/lib/pos-types";
import type { Customer } from "@/components/pos/CustomerSelection";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { hasEnoughStock, hasEnoughStockForUpdate, applyPricingRules, resolveSize, calculateItemPrice } from "@/lib/pricing";
import type { PricingRuleRow } from "@/integrations/supabase/types-extensions";

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
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  
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
  productTypes: Record<string, unknown>[];
  pricingRules: Record<string, unknown>[];

  // Setters
  setDynamicData: (sizes: Tables<'sizes'>[], toppings: Product[], types: Record<string, unknown>[], rules: Record<string, unknown>[]) => void;
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
    notifyCritical?: (msg: string) => void,
    discountMessage?: string
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

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      
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

      addToCart: (product, selectedSizeId, selectedToppingIds, customized = false, quantity = 1, notifyCritical, overrideDiscountMessage) => {
        const state = get();
        const cart = state.cart;
        const typeCfg = state.productTypes.find(t => t.code === product.type);

        const productNeedsSize = product.type !== 'sachet' && product.type !== 'sweet';
        let sizeId = selectedSizeId;
        if (!sizeId && productNeedsSize && state.availableSizes.length > 0) {
          sizeId = state.availableSizes[0].id;
        }
        const size = sizeId ? state.availableSizes.find(s => s.id === sizeId) : null;
        const itemMultiplier = size?.multiplier || 1;

        // Stock validation using utility
        if (!hasEnoughStock(product, cart, quantity, itemMultiplier, typeCfg)) {
          if (notifyCritical) notifyCritical(`No hay suficiente stock de ${product.name} disponible para ${quantity} porciones.`);
          return;
        }

        const validToppings = state.availableToppings.filter(t => selectedToppingIds.includes(t.id));

        const pricingResult = calculateItemPrice(
          product,
          size,
          validToppings,
          state.pricingRules as unknown as PricingRuleRow[]
        );

        const trackMixture = typeCfg?.track_mixture_inventory || product.type === 'granizado' || product.category === 'Granizado';

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
            price: pricingResult.finalPrice,
            quantity: quantity,
            size: size?.name,
            sizeMultiplier: size?.multiplier || 1, 
            toppings: validToppings.length > 0 ? validToppings : undefined,
            customizationId,
            originalPrice: pricingResult.originalPrice !== pricingResult.finalPrice ? pricingResult.originalPrice : undefined,
            discountMessage: pricingResult.discountMessage,
            maxStock: product.stock,
            isGranizado: trackMixture,
            mixtureStock: product.mixtureStock,
            baseVolume: Number(product.base_volume) || 4,
            productPrice: pricingResult.basePrice,
            productType: product.type,
            productCategory: product.category,
            variants: product.variants
          };

          return { cart: cleanCartItems([...state.cart, newItem]) };
        });

        const finalDiscountMessage = overrideDiscountMessage || pricingResult.discountMessage;

        if (finalDiscountMessage) {
          toast.success(`Producto agregado con descuento: ${finalDiscountMessage}`);
        } else {
          toast.success("Producto agregado al carrito");
        }
      },

      updateQuantity: (id, delta, notifyCritical) => {
        const state = get();
        const cart = state.cart;
        const item = cart.find(i => i.id === id);
        if (item && delta > 0) {
          const newQuantity = item.quantity + delta;
          if (!hasEnoughStockForUpdate(item, cart, newQuantity)) {
            if (notifyCritical) {
              const msg = item.isGranizado ? 'Límite de mezcla alcanzado para este sabor.' : `Límite de stock alcanzado (${item.maxStock})`;
              notifyCritical(msg);
            }
            return;
          }
        }

        set(state => {
          const updatedCart = state.cart.map(cartItem => {
            if (cartItem.id === id) {
              const newQty = Math.max(0, cartItem.quantity + delta);
              return { ...cartItem, quantity: newQty };
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

            const mockProduct: Product = {
              id: item.productId,
              type: productType as any,
              category: productCategory,
              base_volume: item.baseVolume,
              mixtureStock: item.mixtureStock,
              stock: item.maxStock,
              price: productPrice,
              name: item.name,
              variants: item.variants || null
            } as Product;

            // Stock validation for customization change
            if (!hasEnoughStock(
              mockProduct,
              state.cart.filter(i => i.id !== itemId),
              item.quantity,
              size?.multiplier || 1,
              typeCfg
            )) {
              if (notifyCritical) notifyCritical(`No hay suficiente mezcla disponible para este tamaño.`);
              return item;
            }

            const pricingResult = calculateItemPrice(
              mockProduct,
              size,
              validToppings,
              state.pricingRules as unknown as PricingRuleRow[]
            );

            return {
              ...item,
              price: pricingResult.finalPrice,
              size: size?.name || undefined,
              sizeMultiplier: size?.multiplier || 1,
              toppings: validToppings.length > 0 ? validToppings : undefined,
              originalPrice: pricingResult.originalPrice !== pricingResult.finalPrice ? pricingResult.originalPrice : undefined,
              discountMessage: pricingResult.discountMessage
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
    }),
    {
      name: "pekao-cart-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
      partialize: (state) => ({
        cart: state.cart,
        discount: state.discount,
        discountType: state.discountType,
        selectedCustomer: state.selectedCustomer
      })
    }
  )
);

// --- Granular Selectors para evitar Re-Renders ---
export const useCartItems = () => useCartStore((state) => state.cart);
export const useCartCustomer = () => useCartStore((state) => state.selectedCustomer);
export const useCartDiscount = () => useCartStore((state) => ({ discount: state.discount, discountType: state.discountType }));
export const useCartHydrated = () => useCartStore((state) => state._hasHydrated);

// Hook para componentes que deben esperar a la hidratación
export const useHydratedCartStore = () => {
  const hasHydrated = useCartStore((state) => state._hasHydrated);
  return hasHydrated;
};

import { memo } from "react";
import type { CartItem, Product } from "@/lib/pos-types";
import type { Customer } from "@/components/pos/CustomerSelection";
import { CartItemList } from "./cart/CartItemList";
import { CartCustomerSelector } from "./cart/CartCustomerSelector";
import { CartTotals } from "./cart/CartTotals";
import { CartHeader } from "./cart/CartHeader";

interface CartSummaryProps {
  cart: CartItem[];
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  subtotal: number;
  discount: number;
  setDiscount: (discount: number) => void;
  discountType: "percent" | "fixed";
  setDiscountType: (type: "percent" | "fixed") => void;
  discountAmount: number;
  total: number;
  onCheckout: () => void;
  onQuickPayment: (method: string) => void;
  onSplitPayment: () => void;
  onClearCart: () => void;
  restoreLastCart?: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  availableSizes?: { id: string; name: string; multiplier: number }[];
  availableToppings?: Product[];
  updateItemCustomization?: (id: string, sizeId: string, toppingIds: string[]) => void;
}

const CartSummary = memo(function CartSummary({
  cart,
  updateQuantity,
  removeItem,
  subtotal,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  discountAmount,
  total,
  onCheckout,
  onQuickPayment,
  onSplitPayment,
  onClearCart,
  selectedCustomer,
  setSelectedCustomer,
  availableSizes = [],
  availableToppings = [],
  updateItemCustomization,
  restoreLastCart
}: CartSummaryProps) {
  return (<div className="w-full lg:w-[30rem] glass-pro border-t lg:border-t-0 lg:border-l border-white/5 p-4 md:p-8 flex flex-col h-full relative z-10 animate-pro-in">
      {/* Header Cart */}
      <CartHeader 
        itemCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        onClearCart={onClearCart}
      />

      {/* Customer Area */}
      <CartCustomerSelector 
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
      />

      {/* Items List */}
      <CartItemList 
        cart={cart}
        updateQuantity={updateQuantity}
        removeItem={removeItem}
        availableSizes={availableSizes}
        availableToppings={availableToppings}
        updateItemCustomization={updateItemCustomization}
      />

      {/* Footer / Summary Area */}
      <CartTotals 
        subtotal={subtotal}
        discount={discount}
        setDiscount={setDiscount}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountAmount={discountAmount}
        total={total}
        onQuickPayment={onQuickPayment}
        onCheckout={onCheckout}
        onSplitPayment={onSplitPayment}
      />
    </div>
  );
});

export default CartSummary;

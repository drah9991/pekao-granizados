import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import ProductGrid from "@/components/pos/ProductGrid";
import ProductCustomizationDialog from "@/components/pos/ProductCustomizationDialog";
import CartSummary from "@/components/pos/CartSummary";
import PaymentDialog, { PaymentMethod } from "@/components/pos/PaymentDialog";
import ReceiptDialog from "@/components/pos/ReceiptDialog";
import { Product } from "@/lib/pos-types";
import { usePOSShortcuts } from "@/hooks/usePOSShortcuts";

export default function POS() {
  const {
    cart,
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
  } = useCart();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizeDialogIsOpen, setCustomizeDialogIsOpen] = useState(false);
  const [paymentDialogIsOpen, setPaymentDialogIsOpen] = useState(false);
  const [receiptDialogIsOpen, setReceiptDialogIsOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>("cash");

  // State for shortcuts
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts Listener
  usePOSShortcuts({
    onSearchFocus: () => searchInputRef.current?.focus(),
    onCategoryChange: (index) => setActiveCategoryIndex(index),
    onProcessPayment: () => handleOpenPaymentDialog(),
    onClearCart: () => {
      if (cart.length > 0 && window.confirm("¿Estás seguro de que deseas limpiar todo el carrito?")) {
        resetCart();
      }
    }
  });

  const handleProductSelect = (product: Product) => {
    if (product.type === 'sachet') {
      addToCart(product, "", [], false);
      return;
    }
    setSelectedProduct(product);
    setCustomizeDialogIsOpen(true);
  };

  const handleAddToCartFromDialog = (product: Product, sizeId: string, toppingIds: string[]) => {
    addToCart(product, sizeId, toppingIds, true);
    setCustomizeDialogIsOpen(false);
  };

  const handleOpenPaymentDialog = (method: PaymentMethod = "cash") => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    if (!selectedCustomer) {
      toast.error("Debe seleccionar un cliente antes de proceder al pago");
      return;
    }
    setDefaultPaymentMethod(method);
    setPaymentDialogIsOpen(true);
  };

  const processSale = async (
    method: PaymentMethod, 
    amountReceived: number, 
    tipAmount: number,
    deliveryData?: {
      type: 'pickup' | 'delivery';
      fee: number;
      address: string;
      phone: string;
    },
    splitDetails?: { cash: number; transfer: number }
  ) => {
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado.");

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (!profile?.store_id) throw new Error("No se pudo obtener la información de la tienda.");

      const mappedItems = cart.flatMap(item => {
        const toppingsPrice = item.toppings?.reduce((sum, t) => sum + t.price, 0) || 0;
        const baseItemPrice = item.price - toppingsPrice;

        const mainItem = {
          product_id: item.productId,
          quantity: item.quantity,
          price: baseItemPrice,
          name: item.name,
          size: item.size || null,
          size_multiplier: item.sizeMultiplier || 1
        };

        const toppings = (item.toppings || []).map(topping => ({
          product_id: topping.id,
          quantity: item.quantity,
          price: topping.price,
          name: `Topping: ${topping.name}`,
          size: null,
          size_multiplier: 1
        }));

        return [mainItem, ...toppings];
      });

      const salePayload = {
        store_id: profile.store_id,
        employee_id: user.id,
        customer_id: selectedCustomer?.id === 'generic' ? null : selectedCustomer?.id,
        subtotal: subtotal, // Original price sum
        tip_amount: tipAmount,
        delivery_fee: deliveryData?.fee || 0,
        order_type: deliveryData?.type || 'pickup',
        delivery_address: deliveryData?.address || null,
        delivery_phone: deliveryData?.phone || null,
        total: total + tipAmount + (deliveryData?.fee || 0), // Discounted total + extras
        payment: method === 'split' ? { 
          method: 'split',
          details: splitDetails
        } : { method },
        items: mappedItems
      };

      const { data: orderData, error: rpcError } = await (supabase as any).rpc('process_sale', {
        sale_data: salePayload
      });

      if (rpcError) throw rpcError;

      setLastOrder({
        id: orderData,
        total: total + tipAmount + (deliveryData?.fee || 0),
        subtotal: total,
        tip_amount: tipAmount,
        created_at: new Date().toISOString(),
        items: cart,
        change: method === "cash" ? Math.max(0, amountReceived - (total + tipAmount + (deliveryData?.fee || 0))) : 0,
        customer: selectedCustomer,
        deliveryData,
        paymentMethod: method,
        splitDetails
      });

      toast.success("¡Venta procesada exitosamente!");
      setPaymentDialogIsOpen(false);
      setReceiptDialogIsOpen(true);
      resetCart();
    } catch (error: any) {
      console.error("Error processing sale:", error);
      toast.error("Error al procesar la venta: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="h-full flex flex-col lg:flex-row bg-slate-950">
        <ProductGrid 
           onProductSelect={handleProductSelect} 
           searchRef={searchInputRef}
           activeCategoryIndex={activeCategoryIndex}
        />

        <CartSummary
          cart={cart}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          subtotal={subtotal}
          discount={discount}
          setDiscount={setDiscount}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountAmount={discountAmount}
          total={total}
          onCheckout={() => handleOpenPaymentDialog()}
          onQuickPayment={(method) => handleOpenPaymentDialog(method as PaymentMethod)}
          onClearCart={() => resetCart()}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
        />
      </div>

      <ProductCustomizationDialog
        isOpen={customizeDialogIsOpen}
        onClose={() => setCustomizeDialogIsOpen(false)}
        product={selectedProduct}
        onAddToCart={handleAddToCartFromDialog}
      />

      <PaymentDialog
        isOpen={paymentDialogIsOpen}
        onClose={() => setPaymentDialogIsOpen(false)}
        subtotal={total}
        onConfirmPayment={processSale}
        isProcessing={isProcessing}
        defaultMethod={defaultPaymentMethod}
      />

      <ReceiptDialog
        isOpen={receiptDialogIsOpen}
        onClose={() => {
          setReceiptDialogIsOpen(false);
          setLastOrder(null);
        }}
        lastOrder={lastOrder}
      />
    </Layout>
  );
}
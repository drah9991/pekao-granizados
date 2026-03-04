import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import ProductGrid from "@/components/pos/ProductGrid";
import ProductCustomizationDialog from "@/components/pos/ProductCustomizationDialog";
import CartSummary from "@/components/pos/CartSummary";
import PaymentDialog from "@/components/pos/PaymentDialog";
import ReceiptDialog from "@/components/pos/ReceiptDialog";
import { Product, CartItem } from "@/lib/pos-types";
import { PaymentMethod } from "@/components/pos/PaymentDialog";
import { Tables } from "@/integrations/supabase/types";

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
  } = useCart();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizeDialogIsOpen, setCustomizeDialogIsOpen] = useState(false);
  const [paymentDialogIsOpen, setPaymentDialogIsOpen] = useState(false);
  const [receiptDialogIsOpen, setReceiptDialogIsOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setCustomizeDialogIsOpen(true);
  };

  const handleAddToCartFromDialog = (product: Product, sizeId: string, toppingIds: string[]) => {
    addToCart(product, sizeId, toppingIds, true);
    setCustomizeDialogIsOpen(false);
  };

  const handleOpenPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentDialogIsOpen(true);
  };

  const processSale = async (method: PaymentMethod, amountReceived: number) => {
    setIsProcessing(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Usuario no autenticado.");
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.store_id) {
        throw new Error("No se pudo obtener la información de la tienda del usuario.");
      }

      // Prepare items for RPC (flattening product + toppings for stock deduction)
      // Note: The new process_sale expects a single JSON payload.
      const mappedItems = cart.flatMap(item => {
        const toppingsPrice = item.toppings?.reduce((sum, t) => sum + t.price, 0) || 0;
        const baseItemPrice = item.price - toppingsPrice;

        const mainItem = {
          product_id: item.productId,
          quantity: item.quantity,
          price: baseItemPrice,
          name: item.name,
          size: item.size || null
        };

        const toppings = (item.toppings || []).map(topping => ({
          product_id: topping.id,
          quantity: item.quantity,
          price: topping.price,
          name: `Topping: ${topping.name}`,
          size: null
        }));

        return [mainItem, ...toppings];
      });

      const salePayload = {
        store_id: profile.store_id,
        employee_id: user.id,
        total: total,
        payment: method,
        items: mappedItems
      };

      const { data: orderData, error: rpcError } = await (supabase as any).rpc('process_sale', {
        sale_data: salePayload
      });

      if (rpcError) throw rpcError;

      setLastOrder({
        id: orderData, // The RPC returns the order ID
        total: total,
        created_at: new Date().toISOString(),
        items: cart,
        change: method === "cash" ? Math.max(0, amountReceived - total) : 0,
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

  const handleCloseReceiptDialog = () => {
    setReceiptDialogIsOpen(false);
    setLastOrder(null);
  };

  return (
    <Layout>
      <div className="h-full flex flex-col lg:flex-row">
        <ProductGrid onProductSelect={handleProductSelect} />

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
          onCheckout={handleOpenPaymentDialog}
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
        total={total}
        onConfirmPayment={processSale}
        isProcessing={isProcessing}
      />

      <ReceiptDialog
        isOpen={receiptDialogIsOpen}
        onClose={handleCloseReceiptDialog}
        lastOrder={lastOrder}
      />
    </Layout>
  );
}
import { useState } from "react";
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
import { products as staticProducts } from "@/lib/pos-data";

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
  } = useCart({ products: staticProducts });

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
    addToCart(product, sizeId, toppingIds, true); // Pass true for customized
    setCustomizeDialogIsOpen(false);
  };

  const handleOpenPaymentDialog = () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentDialogIsOpen(true);
  };

  const handleConfirmPayment = async (method: "cash" | "card", amountReceived: number) => {
    setIsProcessing(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          store_id: "00000000-0000-0000-0000-000000000001", // ID de tienda demo
          subtotal: subtotal,
          tax: 0, // Assuming 0 tax for now, can be calculated later
          total: total,
          status: "completed",
          payment: {
            method: method,
            amount_received: amountReceived,
            change: method === "cash" ? Math.max(0, amountReceived - total) : 0,
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        name: item.name,
        price: item.price,
        qty: item.quantity,
        subtotal: item.price * item.quantity,
        tax: 0, // Assuming 0 tax for now
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setLastOrder({
        ...orderData,
        items: cart,
        change: method === "cash" ? Math.max(0, amountReceived - total) : 0,
      });

      toast.success("¡Venta procesada exitosamente!");
      setPaymentDialogIsOpen(false);
      setReceiptDialogIsOpen(true);
      resetCart(); // Clear cart and reset discount
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
        onConfirmPayment={handleConfirmPayment}
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
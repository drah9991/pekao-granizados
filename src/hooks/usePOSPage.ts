import { useState, useRef } from "react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { usePOS } from "@/hooks/usePOS";
import { usePOSShortcuts } from "@/hooks/usePOSShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAlerts } from "@/hooks/useAlerts";
import { Product } from "@/lib/pos-types";
import { PaymentMethod } from "@/components/pos/PaymentDialog";

export function usePOSPage() {
  const {
    cart, addToCart, updateQuantity, removeItem, subtotal,
    discount, setDiscount, discountType, setDiscountType,
    discountAmount, total, resetCart, restoreLastCart,
    selectedCustomer, setSelectedCustomer
  } = useCart();

  const {
    isProcessing, isOnline, pendingOrdersCount, processSale, handleSync
  } = usePOS();

  const { notifyWarning } = useAlerts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizeDialogIsOpen, setCustomizeDialogIsOpen] = useState(false);
  const [paymentDialogIsOpen, setPaymentDialogIsOpen] = useState(false);
  const [receiptDialogIsOpen, setReceiptDialogIsOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>("cash");

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"products" | "cart">("products");

  usePOSShortcuts({
    onSearchFocus: () => searchInputRef.current?.focus(),
    onCategoryChange: (index) => setActiveCategoryIndex(index),
    onProcessPayment: () => handleOpenPaymentDialog(),
    onClearCart: () => {
      if (cart.length > 0 && window.confirm("¿Estás seguro de que deseas limpiar todo el carrito?")) {
        resetCart();
        toast("Carrito vaciado");
      }
    }
  });

  const handleProductSelect = (product: Product) => {
    if (product.type === 'sachet' || product.type === 'sweet') {
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
      notifyWarning("El carrito está vacío");
      return;
    }
    if (!selectedCustomer) {
      notifyWarning("Debe seleccionar un cliente antes de proceder al pago");
      return;
    }
    setDefaultPaymentMethod(method);
    setPaymentDialogIsOpen(true);
  };

  const onConfirmSale = async (
    method: PaymentMethod, 
    amountReceived: number, 
    deliveryData?: any,
    splitDetails?: any
  ) => {
    const orderData = await processSale(
      cart,
      total,
      subtotal,
      discountAmount,
      selectedCustomer,
      method, 
      amountReceived, 
      deliveryData, 
      splitDetails
    );
    if (orderData) {
      setLastOrder(orderData);
      setPaymentDialogIsOpen(false);
      setReceiptDialogIsOpen(true);
      resetCart();
    }
  };

  return {
    cart, addToCart, updateQuantity, removeItem, subtotal, discount, setDiscount, discountType, setDiscountType,
    discountAmount, total, resetCart, restoreLastCart, selectedCustomer, setSelectedCustomer,
    isProcessing, isOnline, pendingOrdersCount, processSale, handleSync,
    selectedProduct, setSelectedProduct,
    customizeDialogIsOpen, setCustomizeDialogIsOpen,
    paymentDialogIsOpen, setPaymentDialogIsOpen,
    receiptDialogIsOpen, setReceiptDialogIsOpen,
    lastOrder, setLastOrder,
    defaultPaymentMethod, setDefaultPaymentMethod,
    activeCategoryIndex, setActiveCategoryIndex,
    searchInputRef,
    isMobile,
    viewMode, setViewMode,
    handleProductSelect, handleAddToCartFromDialog, handleOpenPaymentDialog, onConfirmSale
  };
}

import { useState, useRef, useTransition, useCallback } from "react";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";
import { usePOS } from "@/hooks/usePOS";
import { usePOSShortcuts } from "@/hooks/usePOSShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAlerts } from "@/hooks/useAlerts";
import type { Product } from "@/lib/pos-types";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";

export function usePOSPage() {
  const {
    cart, addToCart, updateQuantity, removeItem, subtotal,
    discount, setDiscount, discountType, setDiscountType,
    discountAmount, total, resetCart, restoreLastCart,
    selectedCustomer, setSelectedCustomer,
    availableSizes, availableToppings, updateItemCustomization
  } = useCart();

  const {
    isProcessing, isOnline, pendingOrdersCount, pendingOrders, processSale, handleSync, checkPendingOrders
  } = usePOS();

  const { notifyWarning } = useAlerts();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizeDialogIsOpen, setCustomizeDialogIsOpen] = useState(false);
  const [paymentDialogIsOpen, setPaymentDialogIsOpen] = useState(false);
  const [splitBillDialogIsOpen, setSplitBillDialogIsOpen] = useState(false);
  const [receiptDialogIsOpen, setReceiptDialogIsOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<Record<string, unknown> | null>(null);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>("cash");

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const isMobile = useIsMobile();
  const [viewMode, setViewModeInternal] = useState<"products" | "cart">("products");
  const [, startViewTransition] = useTransition();

  const setViewMode = (mode: "products" | "cart") => {
    startViewTransition(() => {
      setViewModeInternal(mode);
    });
  };

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

  const handleProductSelect = useCallback((product: Product) => {
    addToCart(product, "", [], false);
  }, [addToCart]);

  const handleAddToCartFromDialog = useCallback((product: Product, sizeId: string, toppingIds: string[], quantity: number = 1) => {
    addToCart(product, sizeId, toppingIds, true, quantity);
    setCustomizeDialogIsOpen(false);
  }, [addToCart]);

  const handleOpenPaymentDialog = useCallback((method: PaymentMethod = "cash") => {
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
  }, [cart.length, selectedCustomer, notifyWarning]);

  const handleOpenSplitBillDialog = useCallback(() => {
    if (cart.length === 0) {
      notifyWarning("El carrito está vacío");
      return;
    }
    if (!selectedCustomer) {
      notifyWarning("Debe seleccionar un cliente antes de proceder al pago");
      return;
    }
    setSplitBillDialogIsOpen(true);
  }, [cart.length, selectedCustomer, notifyWarning]);

  const onConfirmSale = useCallback(async (
    method: PaymentMethod, 
    amountReceived: number, 
    deliveryData?: Record<string, unknown>,
    splitDetails?: Record<string, unknown>
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
      setTimeout(() => {
        setReceiptDialogIsOpen(true);
        resetCart();
      }, 0);
    }
  }, [cart, total, subtotal, discountAmount, selectedCustomer, processSale, resetCart]);

  return {
    cart, addToCart, updateQuantity, removeItem, subtotal, discount, setDiscount, discountType, setDiscountType,
    discountAmount, total, resetCart, restoreLastCart, selectedCustomer, setSelectedCustomer,
    isProcessing, isOnline, pendingOrdersCount, pendingOrders, processSale, handleSync, checkPendingOrders,
    selectedProduct, setSelectedProduct,
    customizeDialogIsOpen, setCustomizeDialogIsOpen,
    paymentDialogIsOpen, setPaymentDialogIsOpen,
    splitBillDialogIsOpen, setSplitBillDialogIsOpen,
    receiptDialogIsOpen, setReceiptDialogIsOpen,
    lastOrder, setLastOrder,
    defaultPaymentMethod, setDefaultPaymentMethod,
    activeCategoryIndex, setActiveCategoryIndex,
    searchInputRef,
    isMobile,
    viewMode, setViewMode,
    handleProductSelect, handleAddToCartFromDialog, handleOpenPaymentDialog, handleOpenSplitBillDialog, onConfirmSale,
    availableSizes, availableToppings, updateItemCustomization
  };
}

import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/hooks/useCart";
import ProductGrid from "@/components/pos/ProductGrid";
import ProductCustomizationDialog from "@/components/pos/ProductCustomizationDialog";
import CartSummary from "@/components/pos/CartSummary";
import PaymentDialog, { PaymentMethod } from "@/components/pos/PaymentDialog";
import ReceiptDialog from "@/components/pos/ReceiptDialog";
import { Product } from "@/lib/pos-types";
import { usePOSShortcuts } from "@/hooks/usePOSShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { ShoppingBag, Receipt as ReceiptIcon, WifiOff, CloudUpload, Shield, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTurn } from "@/hooks/useTurn";
import { offlineService } from "@/lib/OfflineService";
import { useAlerts } from "@/hooks/useAlerts";

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
    restoreLastCart,
    selectedCustomer,
    setSelectedCustomer
  } = useCart();
  const { user, storeId } = useAuth();
  const { activeTurn, isLoading: isLoadingTurn } = useTurn();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizeDialogIsOpen, setCustomizeDialogIsOpen] = useState(false);
  const [paymentDialogIsOpen, setPaymentDialogIsOpen] = useState(false);
  const [receiptDialogIsOpen, setReceiptDialogIsOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>("cash");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const { notifyInfo, notifyWarning, notifyCritical } = useAlerts();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPendingOrders();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingOrders = async () => {
    const pending = await offlineService.getPendingOrders();
    setPendingOrdersCount(pending.length);
  };

  // State for shortcuts
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Mobile View Mode
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"products" | "cart">("products");

  // Keyboard Shortcuts Listener
  usePOSShortcuts({
    onSearchFocus: () => searchInputRef.current?.focus(),
    onCategoryChange: (index) => setActiveCategoryIndex(index),
    onProcessPayment: () => handleOpenPaymentDialog(),
    onClearCart: () => {
      if (cart.length > 0 && window.confirm("¿Estás seguro de que deseas limpiar todo el carrito?")) {
        resetCart();
        toast("Carrito vaciado", {
          action: {
            label: "Deshacer",
            onClick: () => restoreLastCart()
          },
          duration: 5000
        });
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

  const processSale = async (
    method: PaymentMethod, 
    amountReceived: number, 
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
      if (!user) throw new Error("Usuario no autenticado.");
      if (!storeId) throw new Error("No se pudo obtener la información de la tienda.");

      if (!activeTurn || activeTurn.status === 'paused') {
        notifyCritical("Debes tener un turno activo para procesar ventas.");
        return;
      }

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
        store_id: storeId,
        employee_id: user.id,
        customer_id: selectedCustomer?.id === 'generic' ? null : selectedCustomer?.id,
        subtotal: subtotal, // Original price sum
        delivery_fee: deliveryData?.fee || 0,
        order_type: deliveryData?.type || 'pickup',
        delivery_address: deliveryData?.address || null,
        delivery_phone: deliveryData?.phone || null,
        total: total + (deliveryData?.fee || 0), // Discounted total + extras
        payment: method === 'split' ? { 
          method: 'split',
          details: splitDetails
        } : { method },
        items: mappedItems
      };

      let orderData: any;

      if (isOnline) {
        const { data: orderWithId, error: rpcError } = await (supabase as any).rpc('process_sale', {
          sale_data: salePayload
        });

        if (rpcError) throw rpcError;
        orderData = orderWithId;
      } else {
        // Offline Flow
        const offlineOrder = await offlineService.saveOfflineOrder(salePayload);
        orderData = offlineOrder.id;
        notifyInfo("Venta guardada localmente (Modo Offline)");
        checkPendingOrders();
      }

      setLastOrder({
        id: orderData,
        total: total + (deliveryData?.fee || 0),
        subtotal: total,
        created_at: new Date().toISOString(),
        items: cart,
        change: method === "cash" ? Math.max(0, amountReceived - (total + (deliveryData?.fee || 0))) : 0,
        customer: selectedCustomer,
        deliveryData,
        paymentMethod: method,
        splitDetails
      });

      notifyInfo("¡Venta procesada exitosamente!");
      setPaymentDialogIsOpen(false);
      setReceiptDialogIsOpen(true);
      resetCart();
    } catch (error: any) {
      console.error("Error processing sale:", error);
      notifyCritical("Error al procesar la venta: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      notifyCritical("No hay conexión a internet para sincronizar.");
      return;
    }

    setIsProcessing(true);
    try {
      const pending = await offlineService.getPendingOrders();
      if (pending.length === 0) {
        notifyInfo("No hay pedidos pendientes.");
        return;
      }

      let successCount = 0;
      for (const order of pending) {
        try {
          const { error } = await (supabase as any).rpc('process_sale', {
            sale_data: order.payload
          });
          if (!error) {
            await offlineService.markOrderSynced(order.id);
            successCount++;
          }
        } catch (e) {
          console.error("Error syncing order:", order.id, e);
        }
      }

      await checkPendingOrders();
      if (successCount > 0) {
        notifyInfo(`Sincronización completada: ${successCount} pedidos subidos.`);
      }
    } catch (error: any) {
      notifyCritical("Error durante la sincronización: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <Layout>
      <div className="h-full flex flex-col lg:flex-row bg-slate-950 relative overflow-hidden">
        {/* Turn Blocking logic is now handled by CriticalBanner in Layout */}
        {/* Mobile/Tablet Navigation Tabs - Visible below 800px */}
        <div className="flex lg:hidden xl:hidden border-b border-white/10 bg-slate-900 sticky top-0 z-20 items-center pr-4 [@media(min-width:800px)]:hidden">
          <button
            onClick={() => setViewMode("products")}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all",
              viewMode === "products" 
                ? "text-primary border-b-2 border-primary bg-primary/5" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <ShoppingBag size={18} />
            Productos
          </button>
          <button
            onClick={() => setViewMode("cart")}
            className={cn(
              "flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all relative",
              viewMode === "cart" 
                ? "text-primary border-b-2 border-primary bg-primary/5" 
                : "text-muted-foreground hover:text-white"
            )}
          >
            <ReceiptIcon size={18} />
            Carrito
            {cart.length > 0 && (
              <span className="absolute top-3 right-1/4 w-5 h-5 bg-primary text-white text-[10px] rounded-full flex items-center justify-center animate-pulse shadow-glow">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
          
          {pendingOrdersCount > 0 && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="text-amber-500 animate-pulse"
              onClick={handleSync}
            >
              <CloudUpload size={20} />
            </Button>
          )}
        </div>

        {/* Product Grid - Visible always on lg+, or when viewMode is products on smaller screens */}
        <div className={cn(
          "flex-1 h-full overflow-hidden flex flex-col",
          viewMode !== "products" && "hidden lg:flex [@media(min-width:800px)]:flex"
        )}>
          {/* Desktop Offline Indicator */}
          {!isOnline && (
            <div className="hidden lg:flex items-center justify-between px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs font-bold animate-pulse">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                MODO OFFLINE ACTIVO - Las ventas se guardarán localmente
              </div>
              {pendingOrdersCount > 0 && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 border-amber-500/50 text-amber-500 hover:bg-amber-500/20"
                  onClick={handleSync}
                  disabled={isProcessing}
                >
                  <CloudUpload className="mr-2 h-3 w-3" />
                  Sincronizar {pendingOrdersCount} pedidos
                </Button>
              )}
            </div>
          )}
          <ProductGrid 
            onProductSelect={handleProductSelect} 
            searchRef={searchInputRef}
            activeCategoryIndex={activeCategoryIndex}
          />
        </div>

        {/* Cart Summary - Visible always on lg+, or when viewMode is cart on smaller screens */}
        <div className={cn(
          "h-full overflow-hidden flex flex-col",
          viewMode !== "cart" && "hidden lg:flex [@media(min-width:800px)]:flex"
        )}>
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
            onClearCart={() => {
               resetCart();
               toast("Carrito vaciado", {
                 action: {
                   label: "Deshacer",
                   onClick: () => restoreLastCart()
                 },
                 duration: 6000
               });
            }}
            restoreLastCart={restoreLastCart}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
          />
        </div>
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
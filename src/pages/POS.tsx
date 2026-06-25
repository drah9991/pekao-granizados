import React, { lazy, Suspense, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import ProductGrid from "@/components/pos/ProductGrid";
import CartSummary from "@/components/pos/CartSummary";
import { ShoppingBag, Receipt as ReceiptIcon, WifiOff, CloudUpload, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePOSPage } from "@/hooks/usePOSPage";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";
import SyncDrawer from "@/components/pos/SyncDrawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const ProductCustomizationDialog = lazy(() => import("@/components/pos/ProductCustomizationDialog"));
const PaymentDialog = lazy(() => import("@/components/pos/PaymentDialog"));
const SplitBillDialog = lazy(() => import("@/components/pos/SplitBillDialog"));
const ReceiptDialog = lazy(() => import("@/components/pos/ReceiptDialog"));
const ShortcutsHelpDialog = lazy(() => import("@/components/pos/ShortcutsHelpDialog"));

export default function POS() {
  const {
    cart, updateQuantity, removeItem, subtotal, discount, setDiscount, discountType, setDiscountType,
    discountAmount, total, resetCart, restoreLastCart, selectedCustomer, setSelectedCustomer,
    isProcessing, isOnline, pendingOrdersCount, pendingOrders, processSale, handleSync, checkPendingOrders,
    selectedProduct, customizeDialogIsOpen, setCustomizeDialogIsOpen,
    paymentDialogIsOpen, setPaymentDialogIsOpen,
    splitBillDialogIsOpen, setSplitBillDialogIsOpen,
    receiptDialogIsOpen, setReceiptDialogIsOpen,
    lastOrder, setLastOrder,
    defaultPaymentMethod, activeCategoryIndex, searchInputRef, viewMode, setViewMode,
    handleProductSelect, handleAddToCartFromDialog, handleOpenPaymentDialog, handleOpenSplitBillDialog, onConfirmSale,
    availableSizes, availableToppings, updateItemCustomization,
    shortcutsHelpIsOpen, setShortcutsHelpIsOpen
  } = usePOSPage();

  const handleClearCart = useCallback(() => {
    resetCart();
    toast("Carrito vaciado");
  }, [resetCart]);

  const [syncDrawerIsOpen, setSyncDrawerIsOpen] = useState(false);

  return (
    <Layout fullWidth>
      <div className="fixed top-4 right-4 z-[60] hidden lg:block">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShortcutsHelpIsOpen(prev => !prev)}
              className="w-10 h-10 rounded-2xl glass-pro bg-card/85 border border-white/10 hover:border-primary/50 text-muted-foreground hover:text-primary shadow-glow transition-all"
              aria-label="Mostrar atajos de teclado (?)"
            >
              <Keyboard className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="glass-pro border-white/10 text-xs">
            Atajos de Teclado (?)
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row bg-transparent relative h-full overflow-hidden">
        <div className="flex lg:hidden glass-pro border-b border-white/10 sticky top-0 z-20 items-center pr-4">
          <button
            onClick={() => setViewMode("products")}
            className={cn(
              "flex-1 py-3.5 flex items-center justify-center gap-2 font-black transition-all text-[11px] uppercase tracking-[0.2em] font-space-grotesk",
              viewMode === "products" ? "text-primary border-b-2 border-primary bg-primary/10" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            <ShoppingBag size={18} /> Catalog
          </button>
          <button
            onClick={() => setViewMode("cart")}
            className={cn(
              "flex-1 py-3.5 flex items-center justify-center gap-2 font-black transition-all relative text-[11px] uppercase tracking-[0.2em] font-space-grotesk",
              viewMode === "cart" ? "text-primary border-b-2 border-primary bg-primary/10" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            <ReceiptIcon size={18} /> Checkout
            {cart.length > 0 && (
              <span className="absolute top-3 right-1/4 w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center shadow-glow-pro">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
          
          {pendingOrdersCount > 0 && (
            <Button size="icon" variant="ghost" className="text-amber-500 animate-pulse" onClick={() => setSyncDrawerIsOpen(true)} aria-label="Ver y sincronizar pedidos locales pendientes">
              <CloudUpload size={20} />
            </Button>
          )}
        </div>

        <div className={cn(
          "flex-1 min-h-0 flex flex-col",
          viewMode !== "products" && "hidden lg:flex"
        )}>
          {!isOnline && (
            <div className="flex items-center justify-between px-6 py-2 glass-pro bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-[10px] font-black uppercase italic tracking-widest shadow-inner">
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4" /> MODO OFFLINE ACTIVO
              </div>
              {pendingOrdersCount > 0 && (
                <Button size="sm" variant="outline" className="h-7 rounded-lg border-amber-500/50 text-[9px]" onClick={() => setSyncDrawerIsOpen(true)} disabled={isProcessing}>
                  Sincronizar {pendingOrdersCount} pedidos
                </Button>
              )}
            </div>
          )}
          {isOnline && pendingOrdersCount > 0 && (
            <div className="flex items-center justify-between px-6 py-2 glass-pro bg-primary/10 border-b border-primary/20 text-primary text-[10px] font-black uppercase italic tracking-widest shadow-inner animate-pulse">
              <div className="flex items-center gap-2">
                <CloudUpload className="h-4 w-4 text-primary" /> Sincronización pendiente ({pendingOrdersCount} órdenes en cola local)
              </div>
              <Button size="sm" variant="outline" className="h-7 rounded-lg border-primary/50 text-[9px] text-primary hover:bg-primary/15" onClick={() => setSyncDrawerIsOpen(true)} disabled={isProcessing}>
                Ver Cola / Sincronizar
              </Button>
            </div>
          )}
          <ProductGrid 
            onProductSelect={handleProductSelect} 
            searchRef={searchInputRef}
            activeCategoryIndex={activeCategoryIndex}
          />
        </div>

        <div className={cn(
          "w-full lg:w-[420px] xl:w-[480px] 2xl:w-[500px] flex flex-col min-h-0 border-l border-white/5",
          "lg:h-full lg:overflow-hidden",
          viewMode !== "cart" && "hidden lg:flex"
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
            onCheckout={handleOpenPaymentDialog}
            onQuickPayment={handleOpenPaymentDialog}
            onSplitPayment={handleOpenSplitBillDialog}
            onClearCart={handleClearCart}
            restoreLastCart={restoreLastCart}
            selectedCustomer={selectedCustomer}
            setSelectedCustomer={setSelectedCustomer}
            availableSizes={availableSizes}
            availableToppings={availableToppings}
            updateItemCustomization={updateItemCustomization}
          />
        </div>
      </div>

      <Suspense fallback={null}>
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
          onConfirmPayment={onConfirmSale}
          isProcessing={isProcessing}
          defaultMethod={defaultPaymentMethod}
        />

        <SplitBillDialog
          isOpen={splitBillDialogIsOpen}
          onClose={() => setSplitBillDialogIsOpen(false)}
          cart={cart}
          subtotal={subtotal}
          discountAmount={discountAmount}
          total={total}
          selectedCustomer={selectedCustomer}
          processSale={processSale}
          resetCart={resetCart}
        />

        <ReceiptDialog
          isOpen={receiptDialogIsOpen}
          onClose={() => {
            setReceiptDialogIsOpen(false);
            setLastOrder(null);
          }}
          lastOrder={lastOrder}
        />

        <ShortcutsHelpDialog
          isOpen={shortcutsHelpIsOpen}
          onClose={() => setShortcutsHelpIsOpen(false)}
        />
      </Suspense>

      <SyncDrawer 
        isOpen={syncDrawerIsOpen}
        onClose={() => setSyncDrawerIsOpen(false)}
        pendingOrders={pendingOrders}
        isOnline={isOnline}
        isProcessing={isProcessing}
        onSync={handleSync}
        checkPendingOrders={checkPendingOrders}
      />
    </Layout>
  );
}
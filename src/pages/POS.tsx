import React, { lazy, Suspense, useState } from "react";
import Layout from "@/components/Layout";
import { toast } from "sonner";
import ProductGrid from "@/components/pos/ProductGrid";
import CartSummary from "@/components/pos/CartSummary";
import { ShoppingBag, Receipt as ReceiptIcon, WifiOff, CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePOSPage } from "@/hooks/usePOSPage";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";
import SyncDrawer from "@/components/pos/SyncDrawer";

const ProductCustomizationDialog = lazy(() => import("@/components/pos/ProductCustomizationDialog"));
const PaymentDialog = lazy(() => import("@/components/pos/PaymentDialog"));
const ReceiptDialog = lazy(() => import("@/components/pos/ReceiptDialog"));

export default function POS() {
  const {
    cart, updateQuantity, removeItem, subtotal, discount, setDiscount, discountType, setDiscountType,
    discountAmount, total, resetCart, restoreLastCart, selectedCustomer, setSelectedCustomer,
    isProcessing, isOnline, pendingOrdersCount, pendingOrders, handleSync, checkPendingOrders,
    selectedProduct, customizeDialogIsOpen, setCustomizeDialogIsOpen,
    paymentDialogIsOpen, setPaymentDialogIsOpen,
    receiptDialogIsOpen, setReceiptDialogIsOpen,
    lastOrder, setLastOrder,
    defaultPaymentMethod, activeCategoryIndex, searchInputRef, viewMode, setViewMode,
    handleProductSelect, handleAddToCartFromDialog, handleOpenPaymentDialog, onConfirmSale,
    availableSizes, availableToppings, updateItemCustomization
  } = usePOSPage();

  const [syncDrawerIsOpen, setSyncDrawerIsOpen] = useState(false);

  return (
    <Layout fullWidth>
      <div className="h-full flex flex-col lg:flex-row bg-transparent relative overflow-hidden">
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
            <Button size="icon" variant="ghost" className="text-amber-500 animate-pulse" onClick={() => setSyncDrawerIsOpen(true)}>
              <CloudUpload size={20} />
            </Button>
          )}
        </div>

        <div className={cn(
          "flex-1 h-full overflow-hidden flex flex-col",
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
          "h-full overflow-hidden flex flex-col",
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
            onCheckout={() => handleOpenPaymentDialog()}
            onQuickPayment={(method) => handleOpenPaymentDialog(method as PaymentMethod)}
            onClearCart={() => {
               resetCart();
               toast("Carrito vaciado");
            }}
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

        <ReceiptDialog
          isOpen={receiptDialogIsOpen}
          onClose={() => {
            setReceiptDialogIsOpen(false);
            setLastOrder(null);
          }}
          lastOrder={lastOrder}
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
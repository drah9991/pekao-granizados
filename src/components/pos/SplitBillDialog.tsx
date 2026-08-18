import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Split } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import type { CartItem } from "@/lib/pos-types";
import type { Customer } from "@/components/pos/CustomerSelection";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";
import { useSplitBill } from "@/hooks/useSplitBill";
import { SplitBillSettledView } from "@/components/pos/split-bill/SplitBillSettledView";
import { SplitBillPaymentPanel } from "@/components/pos/split-bill/SplitBillPaymentPanel";
import { EvenSplitTab } from "@/components/pos/split-bill/EvenSplitTab";
import { ItemsSplitTab } from "@/components/pos/split-bill/ItemsSplitTab";
import { SplitBillReceiptDialog } from "@/components/pos/split-bill/SplitBillReceiptDialog";

interface SplitBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  selectedCustomer: Customer | null;
  processSale: (
    cart: any[],
    saleTotal: number,
    saleSubtotal: number,
    saleDiscountAmount: number,
    saleCustomer: any | null,
    method: PaymentMethod,
    amountReceived: number,
    deliveryData?: any,
    splitDetails?: { cash: number; transfer: number }
  ) => Promise<any | null>;
  resetCart: () => void;
}

export default function SplitBillDialog({
  isOpen,
  onClose,
  cart,
  subtotal,
  discountAmount,
  total,
  selectedCustomer,
  processSale,
  resetCart
}: SplitBillDialogProps) {
  const split = useSplitBill(isOpen, cart, subtotal, discountAmount, total, selectedCustomer, processSale);

  const handleFinishCheckout = () => {
    resetCart();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Don't allow closing if we have already processed some payments but not finished
      if (!open) {
        if (split.paidCount > 0 && !split.isFullySettled) {
          toast.warning("Hay pagos parciales registrados. Debes completar el cobro de la cuenta.");
          return;
        }
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[92dvh] overflow-y-auto custom-scrollbar flex flex-col p-6">
        <DialogHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <Split className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-space-grotesk tracking-wide">Dividir Cuenta</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-0.5 text-xs">
                Total de la Orden: <span className="font-extrabold text-foreground">{formatCOP(total)}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {split.isFullySettled ? (
          <SplitBillSettledView
            total={total}
            activeClients={split.activeClients}
            onViewReceipt={split.setViewingReceiptIndex}
            onFinishCheckout={handleFinishCheckout}
          />
        ) : split.activePaymentIndex !== null ? (
          <SplitBillPaymentPanel
            activeClients={split.activeClients}
            activePaymentIndex={split.activePaymentIndex}
            selectedMethod={split.selectedMethod}
            onSelectMethod={split.handleSelectMethod}
            cashReceived={split.cashReceived}
            setCashReceived={split.setCashReceived}
            mixCash={split.mixCash}
            setMixCash={split.setMixCash}
            mixTransfer={split.mixTransfer}
            setMixTransfer={split.setMixTransfer}
            isSubmitProcessing={split.isSubmitProcessing}
            onCancelPayment={split.handleCancelPayment}
            onConfirmPayment={split.handleConfirmClientPayment}
          />
        ) : (
          /* SELECTION & ALLOCATION STAGE */
          <div className="flex-1 flex flex-col min-h-0 space-y-6">
            {split.paidCount > 0 && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs text-primary font-bold">
                <span>PAGOS PROCESADOS: {split.paidCount} / {split.activeClients.length}</span>
                <span>TOTAL RECAUDADO: {formatCOP(split.totalPaidAmount)} / {formatCOP(total)}</span>
              </div>
            )}

            <Tabs defaultValue="even" value={split.splitMode} onValueChange={(val) => split.setSplitMode(val as "even" | "items")} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-black/20 border border-white/5 rounded-xl">
                <TabsTrigger value="even" className="gap-2 font-bold font-space-grotesk text-xs tracking-wider uppercase">
                  <Users className="w-4 h-4" /> Dividir por Partes Iguales
                </TabsTrigger>
                <TabsTrigger value="items" className="gap-2 font-bold font-space-grotesk text-xs tracking-wider uppercase">
                  <Split className="w-4 h-4" /> Dividir por Artículos
                </TabsTrigger>
              </TabsList>

              <EvenSplitTab
                evenCount={split.evenCount}
                evenClients={split.evenClients}
                paidCount={split.paidCount}
                onEvenCountChange={split.handleEvenCountChange}
                onOpenPayment={split.handleOpenPayment}
              />

              <ItemsSplitTab
                cart={cart}
                itemsClients={split.itemsClients}
                isEverythingAssigned={split.isEverythingAssigned}
                paidCount={split.paidCount}
                getUnassignedQuantity={split.getUnassignedQuantity}
                onAdjustItemQuantity={split.handleAdjustItemQuantity}
                onAddClient={split.handleAddClient}
                onRemoveClient={split.handleRemoveClient}
                onOpenPayment={split.handleOpenPayment}
              />
            </Tabs>
          </div>
        )}

        <DialogFooter className="border-t border-white/10 pt-4 flex sm:justify-between items-center gap-4">
          <div className="text-xs text-muted-foreground font-medium text-left">
            Pagos parciales: <span className="font-bold text-foreground">{split.paidCount}</span> de <span className="font-bold text-foreground">{split.activeClients.length}</span> cobrados.
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={split.paidCount > 0 && !split.isFullySettled}
            >
              Cancelar / Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* SINGLE RECEIPT PREVIEW DIALOG ON COMPLETION */}
      {split.viewingReceiptIndex !== null && split.activeClients[split.viewingReceiptIndex]?.orderData && (
        <SplitBillReceiptDialog
          client={split.activeClients[split.viewingReceiptIndex]}
          onClose={() => split.setViewingReceiptIndex(null)}
        />
      )}
    </Dialog>
  );
}

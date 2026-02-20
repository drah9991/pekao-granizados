import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Smartphone, QrCode } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "card" | "transfer" | "qr";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirmPayment: (method: PaymentMethod, amountReceived: number) => void;
  isProcessing: boolean;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "cash", label: "Efectivo", icon: <DollarSign className="w-7 h-7" /> },
  { value: "card", label: "Tarjeta", icon: <CreditCard className="w-7 h-7" /> },
  { value: "transfer", label: "Transferencia", icon: <Smartphone className="w-7 h-7" /> },
  { value: "qr", label: "QR", icon: <QrCode className="w-7 h-7" /> },
];

export default function PaymentDialog({
  isOpen,
  onClose,
  total,
  onConfirmPayment,
  isProcessing,
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmountReceived(total.toFixed(2));
      setPaymentMethod("cash");
    }
  }, [isOpen, total]);

  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(amountReceived) - total) : 0;

  const handleConfirm = () => {
    if (paymentMethod === "cash" && parseFloat(amountReceived) < total) {
      toast.error("El monto recibido es insuficiente");
      return;
    }
    onConfirmPayment(paymentMethod, paymentMethod === "cash" ? parseFloat(amountReceived) : total);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Procesar Pago</DialogTitle>
          <DialogDescription>
            Total a pagar: <span className="font-bold text-foreground text-lg">{formatCurrency(total)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Method Grid */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Método de Pago</Label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 min-h-[90px] active:scale-95",
                    paymentMethod === pm.value
                      ? "border-primary bg-primary/10 text-primary shadow-md"
                      : "border-border hover:border-muted-foreground/50 text-muted-foreground"
                  )}
                >
                  {pm.icon}
                  <span className="font-semibold text-sm">{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash: Amount Received */}
          {paymentMethod === "cash" && (
            <div>
              <Label htmlFor="amount" className="text-base font-semibold mb-2 block">
                Monto Recibido
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                className="text-2xl font-bold border-2 h-14"
                placeholder="0.00"
              />
              {parseFloat(amountReceived) >= total && (
                <div className="mt-4 p-4 bg-accent/10 border-2 border-accent rounded-lg">
                  <p className="text-sm text-muted-foreground">Cambio a devolver</p>
                  <p className="text-3xl font-bold text-accent">
                    {formatCurrency(change)}
                  </p>
                </div>
              )}
              {parseFloat(amountReceived) > 0 && parseFloat(amountReceived) < total && (
                <p className="text-sm text-destructive mt-2">
                  Falta: {formatCurrency(total - parseFloat(amountReceived))}
                </p>
              )}
            </div>
          )}

          {/* Non-cash confirmation */}
          {paymentMethod !== "cash" && (
            <div className="p-4 bg-muted/50 rounded-lg border-2 border-border text-center">
              <p className="text-muted-foreground text-sm">
                {paymentMethod === "card" && "Confirma el pago con tarjeta por:"}
                {paymentMethod === "transfer" && "Confirma la transferencia recibida por:"}
                {paymentMethod === "qr" && "Confirma el pago por QR por:"}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(total)}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="min-h-[48px]">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="gradient-primary min-h-[48px] text-base" disabled={isProcessing}>
            {isProcessing ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

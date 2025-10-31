import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirmPayment: (method: "cash" | "card", amountReceived: number) => void;
  isProcessing: boolean;
}

export default function PaymentDialog({
  isOpen,
  onClose,
  total,
  onConfirmPayment,
  isProcessing,
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [amountReceived, setAmountReceived] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmountReceived(total.toFixed(2)); // Pre-fill with total
      setPaymentMethod("cash"); // Default to cash
    }
  }, [isOpen, total]);

  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(amountReceived) - total) : 0;

  const handleConfirm = () => {
    if (paymentMethod === "cash" && parseFloat(amountReceived) < total) {
      toast.error("El monto recibido es insuficiente");
      return;
    }
    onConfirmPayment(paymentMethod, parseFloat(amountReceived));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Procesar Pago</DialogTitle>
          <DialogDescription>
            Total a pagar: {formatCurrency(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Método de Pago */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Método de Pago</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-muted/50 transition-smooth border-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1 font-medium">
                  <DollarSign className="w-5 h-5 text-secondary" />
                  Efectivo
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-lg hover:bg-muted/50 transition-smooth border-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1 font-medium">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Tarjeta
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Monto Recibido (solo para efectivo) */}
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
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} className="gradient-primary" disabled={isProcessing}>
            {isProcessing ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
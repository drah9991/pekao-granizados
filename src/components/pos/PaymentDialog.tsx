import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Smartphone, QrCode, Heart, X, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "card" | "transfer" | "qr";
type TipOption = "pending" | "10_percent" | "none" | "custom";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number; // The cart total before tip
  onConfirmPayment: (method: PaymentMethod, amountReceived: number, tipAmount: number) => void;
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
  subtotal,
  onConfirmPayment,
  isProcessing,
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [tipOption, setTipOption] = useState<TipOption>("pending");
  const [customTip, setCustomTip] = useState("");

  const suggestedTip = Math.round(subtotal * 0.10);
  const tipAmount = tipOption === "10_percent" 
    ? suggestedTip 
    : tipOption === "custom" 
      ? (parseFloat(customTip) || 0) 
      : 0;
  
  const finalTotal = subtotal + tipAmount;

  useEffect(() => {
    if (isOpen) {
      setAmountReceived("");
      setPaymentMethod("cash");
      setTipOption("pending");
      setCustomTip("");
    }
  }, [isOpen, subtotal]);

  // Update amount received automatically when total changes and we are on cash (and haven't typed yet)
  useEffect(() => {
    if (isOpen && paymentMethod === "cash" && tipOption !== "pending" && amountReceived === "") {
        setAmountReceived(finalTotal.toFixed(2));
    }
  }, [isOpen, paymentMethod, tipOption, finalTotal]);


  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(amountReceived || "0") - finalTotal) : 0;

  const handleConfirm = () => {
    if (tipOption === "pending") {
      toast.error("Debe registrar la decisión del cliente sobre la propina voluntaria.");
      return;
    }
    if (paymentMethod === "cash" && parseFloat(amountReceived || "0") < finalTotal) {
      toast.error("El monto recibido es insuficiente");
      return;
    }
    
    // As per Ley 1935, tip cannot exceed 10% strictly if suggested, but we allow an open field if custom
    // Usually, 10% is the max suggested, let's keep it flexible for custom but warn if it's too high
    if (tipOption === "custom" && tipAmount > suggestedTip) {
        toast.warning("La propina sugerida legal máxima es el 10%.");
        // We will allow it but just warn, since sometimes people want to leave more
    }
    
    onConfirmPayment(
        paymentMethod, 
        paymentMethod === "cash" ? parseFloat(amountReceived || "0") : finalTotal,
        tipAmount
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Procesar Pago</DialogTitle>
          <DialogDescription>
            Validación de pago y propina voluntaria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Tip Section - Ley 1935 de 2018 */}
          <div className="p-4 bg-muted/30 rounded-lg border-2 border-border shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-pink-500" />
              <Label className="text-base font-bold">Propina Voluntaria</Label>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Ley 1935 de 2018: ¿Desea el cliente incluir la propina sugerida del 10%? No constituye base gravable.
            </p>
            
            <div className="grid grid-cols-3 gap-2 mb-2">
              <Button 
                variant={tipOption === "10_percent" ? "default" : "outline"} 
                className={cn("h-16 flex-col gap-1 border-2", tipOption === "10_percent" ? "border-primary bg-primary/20 text-foreground" : "")}
                onClick={() => setTipOption("10_percent")}
              >
                <span>Sugerida</span>
                <span className="font-bold">{formatCurrency(suggestedTip)}</span>
              </Button>
              <Button 
                variant={tipOption === "none" ? "default" : "outline"} 
                className={cn("h-16 flex-col gap-1 border-2", tipOption === "none" ? "border-destructive bg-destructive/20 text-foreground hover:bg-destructive/30" : "")}
                onClick={() => setTipOption("none")}
              >
                <X className="w-4 h-4" />
                <span>No incluir</span>
              </Button>
              <Button 
                variant={tipOption === "custom" ? "default" : "outline"} 
                className={cn("h-16 flex-col gap-1 border-2", tipOption === "custom" ? "border-accent bg-accent/20 text-foreground hover:bg-accent/30" : "")}
                onClick={() => setTipOption("custom")}
              >
                <Edit2 className="w-4 h-4" />
                <span>Otro valor</span>
              </Button>
            </div>

            {tipOption === "custom" && (
              <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="customTip" className="text-xs font-semibold mb-1 block">Monto de Propina</Label>
                <Input
                  id="customTip"
                  type="number"
                  step="100"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  className="font-bold border-2"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-end pb-2 border-b-2 border-dashed">
            <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(subtotal)}</p>
                {tipAmount > 0 && <p className="text-sm text-pink-500 font-medium">Propina: {formatCurrency(tipAmount)}</p>}
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold uppercase text-muted-foreground mr-1">Total a Pagar</p>
                <p className="text-3xl font-black text-foreground">{formatCurrency(finalTotal)}</p>
            </div>
          </div>

          {/* Payment Method Grid */}
          <div className={cn("transition-opacity duration-300", tipOption === "pending" ? "opacity-30 pointer-events-none" : "opacity-100")}>
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
          {paymentMethod === "cash" && tipOption !== "pending" && (
            <div className="animate-in fade-in slide-in-from-top-4">
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
              {parseFloat(amountReceived || "0") >= finalTotal && (
                <div className="mt-4 p-4 bg-accent/10 border-2 border-accent rounded-lg">
                  <p className="text-sm text-muted-foreground">Cambio a devolver</p>
                  <p className="text-3xl font-bold text-accent">
                    {formatCurrency(change)}
                  </p>
                </div>
              )}
              {parseFloat(amountReceived || "0") > 0 && parseFloat(amountReceived || "0") < finalTotal && (
                <p className="text-sm text-destructive mt-2">
                  Falta: {formatCurrency(finalTotal - parseFloat(amountReceived || "0"))}
                </p>
              )}
            </div>
          )}

          {/* Non-cash confirmation */}
          {paymentMethod !== "cash" && tipOption !== "pending" && (
            <div className="p-4 bg-muted/50 rounded-lg border-2 border-border text-center animate-in fade-in slide-in-from-top-4">
              <p className="text-muted-foreground text-sm">
                {paymentMethod === "card" && "Confirma el pago con tarjeta por:"}
                {paymentMethod === "transfer" && "Confirma la transferencia recibida por:"}
                {paymentMethod === "qr" && "Confirma el pago por QR por:"}
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(finalTotal)}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="min-h-[48px]">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            className="gradient-primary min-h-[48px] text-base" 
            disabled={isProcessing || tipOption === "pending"}
          >
            {isProcessing ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

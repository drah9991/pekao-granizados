import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Smartphone, QrCode, Heart, X, Edit2, Truck, Home } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "card" | "transfer" | "qr" | "split";
type TipOption = "pending" | "10_percent" | "none" | "custom";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number; // The cart total before tip
  onConfirmPayment: (
    method: PaymentMethod, 
    amountReceived: number, 
    tipAmount: number,
    deliveryData?: {
      type: 'pickup' | 'delivery';
      fee: number;
      address: string;
      phone: string;
    },
    splitDetails?: { cash: number; transfer: number }
  ) => void;
  isProcessing: boolean;
  defaultMethod?: PaymentMethod;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "cash", label: "Efectivo", icon: <DollarSign className="w-7 h-7" /> },
  { value: "card", label: "Tarjeta", icon: <CreditCard className="w-7 h-7" /> },
  { value: "transfer", label: "Transferencia", icon: <Smartphone className="w-7 h-7" /> },
  { value: "split", label: "Mixto (Efe+Tra)", icon: <div className="flex"><DollarSign className="w-5 h-5" /><Smartphone className="w-5 h-5" /></div> },
  { value: "qr", label: "QR", icon: <QrCode className="w-7 h-7" /> },
];

export default function PaymentDialog({
  isOpen,
  onClose,
  subtotal,
  onConfirmPayment,
  isProcessing,
  defaultMethod = "cash",
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);
  const [amountReceived, setAmountReceived] = useState("");
  const [tipOption, setTipOption] = useState<TipOption>("pending");
  const [customTip, setCustomTip] = useState("");
  
  // Delivery State
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>("pickup");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  
  // Split Payment State
  const [splitCash, setSplitCash] = useState("");
  const [splitTransfer, setSplitTransfer] = useState("");
  const [hasTypedAmount, setHasTypedAmount] = useState(false);

  const suggestedTip = Math.round(subtotal * 0.10);
  const tipAmount = tipOption === "10_percent" 
    ? suggestedTip 
    : tipOption === "custom" 
      ? (parseFloat(customTip) || 0) 
      : 0;
  
  const currentDeliveryFee = orderType === "delivery" ? (parseFloat(deliveryFee) || 0) : 0;
  const finalTotal = subtotal + tipAmount + currentDeliveryFee;

  useEffect(() => {
    if (isOpen) {
      setAmountReceived("");
      setPaymentMethod(defaultMethod);
      setTipOption("pending");
      setCustomTip("");
      setOrderType("pickup");
      setDeliveryFee("");
      setDeliveryAddress("");
      setDeliveryPhone("");
      setSplitCash("");
      setSplitTransfer("");
      setHasTypedAmount(false);
    }
  }, [isOpen, subtotal]);

  // Update amount received automatically when total changes and we are on cash (and haven't typed yet)
  useEffect(() => {
    if (isOpen && paymentMethod === "cash" && tipOption !== "pending" && !hasTypedAmount) {
        setAmountReceived(finalTotal.toFixed(0));
    }
  }, [isOpen, paymentMethod, tipOption, finalTotal, hasTypedAmount]);


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

    if (paymentMethod === "split") {
      const cash = parseFloat(splitCash || "0");
      const transfer = parseFloat(splitTransfer || "0");
      if (Math.abs((cash + transfer) - finalTotal) > 1) {
        toast.error(`La suma de efectivo y transferencia (${formatCurrency(cash + transfer)}) debe ser igual al total (${formatCurrency(finalTotal)})`);
        return;
      }
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
        tipAmount,
        {
          type: orderType,
          fee: currentDeliveryFee,
          address: deliveryAddress,
          phone: deliveryPhone
        },
        paymentMethod === "split" ? { 
          cash: parseFloat(splitCash || "0"), 
          transfer: parseFloat(splitTransfer || "0") 
        } : undefined
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
          {/* Order Type Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold block">Tipo de Pedido</Label>
            <Tabs 
              defaultValue="pickup" 
              value={orderType} 
              onValueChange={(val) => setOrderType(val as 'pickup' | 'delivery')}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="pickup" className="gap-2">
                  <Home className="w-4 h-4" /> Local / Recoger
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-2">
                  <Truck className="w-4 h-4" /> Domicilio
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {orderType === "delivery" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
                <div className="md:col-span-2">
                  <Label htmlFor="deliveryAddress" className="text-xs font-bold uppercase text-primary">Dirección de Entrega *</Label>
                  <Input 
                    id="deliveryAddress" 
                    placeholder="Ej: Calle 123 # 45-67, Apto 101" 
                    className="mt-1"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryPhone" className="text-xs font-bold uppercase text-primary">Teléfono</Label>
                  <Input 
                    id="deliveryPhone" 
                    placeholder="Ej: 3001234567" 
                    className="mt-1"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryFee" className="text-xs font-bold uppercase text-primary">Costo Domicilio</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="deliveryFee" 
                      type="number" 
                      placeholder="0" 
                      className="pl-7"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

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
                {currentDeliveryFee > 0 && <p className="text-sm text-blue-500 font-medium">Domicilio: {formatCurrency(currentDeliveryFee)}</p>}
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
                value={amountReceived}
                onChange={(e) => {
                  setAmountReceived(e.target.value);
                  setHasTypedAmount(true);
                }}
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
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <p className="text-sm text-destructive font-bold">
                    Falta: {formatCurrency(finalTotal - parseFloat(amountReceived || "0"))}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-7 text-[10px] uppercase font-bold text-primary hover:bg-primary/10 w-full"
                    onClick={() => {
                        setPaymentMethod("split");
                        setSplitCash(amountReceived);
                        setSplitTransfer((finalTotal - parseFloat(amountReceived || "0")).toString());
                    }}
                  >
                    ¿Pagar el resto con transferencia?
                  </Button>
                </div>
              )}
            </div>
          )}
          {/* Split Payment: Cash + Transfer */}
          {paymentMethod === "split" && tipOption !== "pending" && (
            <div className="animate-in fade-in slide-in-from-top-4 space-y-4 p-4 bg-muted/30 rounded-lg border-2 border-primary/20">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <DollarSign className="w-5 h-5" />
                <Label className="text-base font-bold">Pago Mixto (Efe + Tra)</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="splitCash" className="text-xs font-bold uppercase">Efectivo</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="splitCash"
                      type="number"
                      value={splitCash}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSplitCash(val);
                        // Auto-calculate the remaining for transfer if possible
                        const numericVal = parseFloat(val || "0");
                        if (numericVal <= finalTotal) {
                          setSplitTransfer((finalTotal - numericVal).toString());
                        }
                      }}
                      className="pl-7 font-bold h-12"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="splitTransfer" className="text-xs font-bold uppercase text-blue-600">Transferencia</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="splitTransfer"
                      type="number"
                      value={splitTransfer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSplitTransfer(val);
                        // Auto-calculate the remaining for cash if possible
                        const numericVal = parseFloat(val || "0");
                        if (numericVal <= finalTotal) {
                          setSplitCash((finalTotal - numericVal).toString());
                        }
                      }}
                      className="pl-7 font-bold h-12 border-blue-200 focus:border-blue-400"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Suma registrada:</span>
                <span className={cn(
                  "font-bold",
                  Math.abs((parseFloat(splitCash || "0") + parseFloat(splitTransfer || "0")) - finalTotal) < 1 
                    ? "text-green-600" 
                    : "text-destructive"
                )}>
                  {formatCurrency(parseFloat(splitCash || "0") + parseFloat(splitTransfer || "0"))} 
                  / {formatCurrency(finalTotal)}
                </span>
              </div>
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

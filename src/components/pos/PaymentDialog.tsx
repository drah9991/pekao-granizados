import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Smartphone, QrCode, Heart, X, Edit2, Truck, Home } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type PaymentMethod = "cash" | "card" | "transfer" | "qr" | "split";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number; // The cart total before tip
  onConfirmPayment: (
    method: PaymentMethod, 
    amountReceived: number, 
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
  
  // Delivery State
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>("pickup");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  
  // Split Payment State
  const [splitCash, setSplitCash] = useState("");
  const [splitTransfer, setSplitTransfer] = useState("");
  const [hasTypedAmount, setHasTypedAmount] = useState(false);

  const currentDeliveryFee = orderType === "delivery" ? (parseFloat(deliveryFee) || 0) : 0;
  const finalTotal = subtotal + currentDeliveryFee;

  useEffect(() => {
    if (isOpen) {
      setAmountReceived("");
      setPaymentMethod(defaultMethod);
      setOrderType("pickup");
      setDeliveryFee("");
      setDeliveryAddress("");
      setDeliveryPhone("");
      setSplitCash("");
      setSplitTransfer("");
      setHasTypedAmount(false);
    }
  }, [isOpen, subtotal, defaultMethod]);

  // Update amount received automatically when total changes and we are on cash (and haven't typed yet)
  useEffect(() => {
    if (isOpen && paymentMethod === "cash" && !hasTypedAmount) {
        setAmountReceived(Math.round(finalTotal).toString());
    }
  }, [isOpen, paymentMethod, finalTotal, hasTypedAmount]);


  const change = paymentMethod === "cash" ? Math.max(0, parseFloat(amountReceived || "0") - finalTotal) : 0;

  const handleConfirm = () => {
    if (paymentMethod === "cash" && parseFloat(amountReceived || "0") < finalTotal) {
      toast.error("El monto recibido es insuficiente");
      return;
    }

    if (paymentMethod === "split") {
      const cash = parseFloat(splitCash || "0");
      const transfer = parseFloat(splitTransfer || "0");
      if (Math.abs((cash + transfer) - finalTotal) > 1) {
        toast.error(`La suma de efectivo y transferencia (${formatCOP(cash + transfer)}) debe ser igual al total (${formatCOP(finalTotal)})`);
        return;
      }
    }
    
    
    onConfirmPayment(
        paymentMethod, 
        paymentMethod === "cash" ? parseFloat(amountReceived || "0") : finalTotal,
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
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-2xl">Procesar Pago</DialogTitle>
          <DialogDescription>
            Validación de pago
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-muted/40 rounded-lg border border-border animate-in fade-in zoom-in-95 duration-200">
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
                      step="1000"
                      placeholder="0" 
                      className="pl-7"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setDeliveryFee((Math.round(val / 1000) * 1000).toString());
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>


          <div className="flex justify-between items-end pb-2 border-b-2 border-dashed">
            <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Subtotal: {formatCOP(subtotal)}</p>
                {currentDeliveryFee > 0 && <p className="text-sm text-blue-500 font-medium">Domicilio: {formatCOP(currentDeliveryFee)}</p>}
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold uppercase text-muted-foreground mr-1">Total a Pagar</p>
                <p className="text-2xl lg:text-3xl font-black text-foreground">{formatCOP(finalTotal)}</p>
            </div>
          </div>

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
            <div className="animate-in fade-in slide-in-from-top-4">
              <Label htmlFor="amount" className="text-base font-semibold mb-2 block">
                Monto Recibido
              </Label>
              <Input
                id="amount"
                type="number"
                step="1000"
                value={amountReceived}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAmountReceived(val < 0 ? "0" : e.target.value);
                  setHasTypedAmount(true);
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setAmountReceived((Math.round(val / 1000) * 1000).toString());
                  }
                }}
                className="text-2xl font-bold border-2 h-14"
                placeholder="0"
              />
              {parseFloat(amountReceived || "0") >= finalTotal && (
                <div className="mt-4 p-4 bg-accent/10 border-2 border-accent rounded-lg">
                  <p className="text-sm text-muted-foreground">Cambio a devolver</p>
                  <p className="text-2xl lg:text-3xl font-bold text-primary">
                    {formatCOP(change)}
                  </p>
                </div>
              )}
              {parseFloat(amountReceived || "0") > 0 && parseFloat(amountReceived || "0") < finalTotal && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <p className="text-sm text-destructive font-bold">
                    Falta: {formatCOP(finalTotal - parseFloat(amountReceived || "0"))}
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
          {paymentMethod === "split" && (
            <div className="animate-in fade-in slide-in-from-top-4 space-y-4 p-4 bg-muted/60 rounded-lg border-2 border-border">
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
                      step="1000"
                      value={splitCash}
                      onChange={(e) => {
                        const val = e.target.value;
                        const numericVal = parseFloat(val || "0");
                        if (numericVal < 0) return;
                        setSplitCash(val);
                        // Auto-calculate the remaining for transfer if possible
                        if (numericVal <= finalTotal) {
                          setSplitTransfer((Math.round(finalTotal - numericVal)).toString());
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setSplitCash((Math.round(val / 1000) * 1000).toString());
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
                      step="1000"
                      value={splitTransfer}
                      onChange={(e) => {
                        const val = e.target.value;
                        const numericVal = parseFloat(val || "0");
                        if (numericVal < 0) return;
                        setSplitTransfer(val);
                        // Auto-calculate the remaining for cash if possible
                        if (numericVal <= finalTotal) {
                          setSplitCash((Math.round(finalTotal - numericVal)).toString());
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setSplitTransfer((Math.round(val / 1000) * 1000).toString());
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
                  {formatCOP(parseFloat(splitCash || "0") + parseFloat(splitTransfer || "0"))} 
                  / {formatCOP(finalTotal)}
                </span>
              </div>
            </div>
          )}

          {/* Non-cash confirmation */}
          {paymentMethod !== "cash" && (
            <div className="p-4 bg-muted/40 rounded-lg border-2 border-border text-center animate-in fade-in slide-in-from-top-4">
              <p className="text-muted-foreground text-sm">
                {paymentMethod === "card" && "Confirma el pago con tarjeta por:"}
                {paymentMethod === "transfer" && "Confirma la transferencia recibida por:"}
                {paymentMethod === "qr" && "Confirma el pago por QR por:"}
              </p>
              <p className="text-xl lg:text-2xl font-bold text-foreground mt-1">{formatCOP(finalTotal)}</p>
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
            disabled={isProcessing}
          >
            {isProcessing ? "Procesando..." : "Confirmar Pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

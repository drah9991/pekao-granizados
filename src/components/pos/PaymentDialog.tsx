import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, DollarSign, Smartphone, QrCode, Heart, X, Edit2, Truck, Home, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/pos-types";

export type PaymentMethod = "cash" | "card" | "transfer" | "qr" | "split";

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number; // The cart total before tip
  cart?: CartItem[];
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

interface PaymentMethodConfig {
  value: PaymentMethod;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  activeColor: string;
  idleColor: string;
  iconBg: string;
}

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { 
    value: "cash", 
    label: "Efectivo", 
    sublabel: "Dinero físico",
    icon: <DollarSign className="w-6 h-6" />, 
    activeColor: "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/20 shadow-md",
    idleColor: "border-emerald-500/25 bg-emerald-500/5 text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/10",
    iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
  },
  { 
    value: "card", 
    label: "Tarjeta", 
    sublabel: "Datáfono / POS",
    icon: <CreditCard className="w-6 h-6" />, 
    activeColor: "border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-400 shadow-sky-500/20 shadow-md",
    idleColor: "border-sky-500/25 bg-sky-500/5 text-muted-foreground hover:border-sky-500/50 hover:bg-sky-500/10",
    iconBg: "bg-sky-500/20 text-sky-600 dark:text-sky-400"
  },
  { 
    value: "transfer", 
    label: "Transferencia", 
    sublabel: "Nequi / Daviplata",
    icon: <Smartphone className="w-6 h-6" />, 
    activeColor: "border-purple-500 bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-purple-500/20 shadow-md",
    idleColor: "border-purple-500/25 bg-purple-500/5 text-muted-foreground hover:border-purple-500/50 hover:bg-purple-500/10",
    iconBg: "bg-purple-500/20 text-purple-600 dark:text-purple-400"
  },
  { 
    value: "split", 
    label: "Mixto", 
    sublabel: "Efe + Transf",
    icon: <div className="flex items-center"><DollarSign className="w-5 h-5" /><Smartphone className="w-5 h-5" /></div>, 
    activeColor: "border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-amber-500/20 shadow-md",
    idleColor: "border-amber-500/25 bg-amber-500/5 text-muted-foreground hover:border-amber-500/50 hover:bg-amber-500/10",
    iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400"
  },
  { 
    value: "qr", 
    label: "Código QR", 
    sublabel: "Escaneo rápido",
    icon: <QrCode className="w-6 h-6" />, 
    activeColor: "border-teal-500 bg-teal-500/15 text-teal-600 dark:text-teal-400 shadow-teal-500/20 shadow-md",
    idleColor: "border-teal-500/25 bg-teal-500/5 text-muted-foreground hover:border-teal-500/50 hover:bg-teal-500/10",
    iconBg: "bg-teal-500/20 text-teal-600 dark:text-teal-400"
  },
];

export default function PaymentDialog({
  isOpen,
  onClose,
  subtotal,
  cart,
  onConfirmPayment,
  isProcessing,
  defaultMethod = "cash",
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultMethod);
  const [amountReceived, setAmountReceived] = useState("");
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  
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
      setIsDetailsOpen(true);
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
          {/* Purchase Details Breakdown */}
          {cart && cart.length > 0 && (
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3.5 space-y-2 font-space-grotesk shadow-sm">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(prev => !prev)}
                className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  <span>Detalle del Pedido ({cart.reduce((acc, item) => acc + item.quantity, 0)} ítems)</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-extrabold">
                    {cart.length} prod.
                  </span>
                  {isDetailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isDetailsOpen && (
                <div className="mt-2 pt-2 border-t border-border/40 max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar animate-in fade-in duration-200">
                  {cart.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-start text-xs bg-card/90 dark:bg-card/70 p-2.5 rounded-xl border-2 border-border/60 gap-2.5 shadow-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">#{index + 1}</span>
                          <span className="font-black text-primary shrink-0">{item.quantity}x</span>
                          <span className="font-bold text-foreground truncate uppercase">{item.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-6">
                          {item.size && (
                            <span className="text-[9px] font-extrabold bg-primary/15 text-primary px-1.5 py-0.5 rounded border border-primary/20 uppercase">
                              {item.size}
                            </span>
                          )}
                          {item.toppings?.map(t => (
                            <span key={t.id} className="text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase border border-border/40">
                              +{t.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-sm text-foreground tabular-nums">{formatCOP(item.price * item.quantity)}</span>
                        {item.quantity > 1 && (
                          <p className="text-[9px] text-muted-foreground font-medium tabular-nums">{formatCOP(item.price)} c/u</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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


          {/* Total Hero Section */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-card/90 p-4 sm:p-5 shadow-md">
            <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground pb-2 border-b border-border/40">
              <span className="uppercase tracking-wider">Subtotal Productos</span>
              <span className="font-bold text-foreground tabular-nums text-sm">{formatCOP(subtotal)}</span>
            </div>
            {currentDeliveryFee > 0 && (
              <div className="flex justify-between items-center text-xs font-semibold text-blue-500 pt-2 pb-2 border-b border-border/40">
                <span className="uppercase tracking-wider">Costo Domicilio</span>
                <span className="font-bold tabular-nums text-sm">+{formatCOP(currentDeliveryFee)}</span>
              </div>
            )}
            <div className="pt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-primary font-dm-sans bg-primary/15 px-2.5 py-1 rounded-full border border-primary/25">
                Total a Pagar
              </span>
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-black text-foreground font-dm-sans tracking-tight tabular-nums block leading-none">
                  {formatCOP(finalTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Grid - Large Tactile Buttons */}
          <div>
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 block">
              Método de Pago
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.value;
                return (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => setPaymentMethod(pm.value)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all duration-150 min-h-[80px] active:scale-[0.97] text-left shadow-sm",
                      isSelected ? pm.activeColor : pm.idleColor,
                      pm.value === "qr" ? "col-span-2 sm:col-span-1" : ""
                    )}
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-current/20", pm.iconBg)}>
                      {pm.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-black text-xs sm:text-sm uppercase tracking-wide leading-tight", isSelected ? "text-foreground" : "")}>
                        {pm.label}
                      </div>
                      <div className="text-[10px] opacity-75 font-medium truncate mt-0.5">
                        {pm.sublabel}
                      </div>
                    </div>
                  </button>
                );
              })}
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

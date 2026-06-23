import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  CreditCard, DollarSign, Smartphone, QrCode, X, Check, Plus, Minus, Users, Split, Printer, AlertCircle, ShoppingBag, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/lib/pos-types";
import type { Customer } from "@/components/pos/CustomerSelection";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";

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

interface SplitClient {
  id: string;
  name: string;
  amount: number;
  subtotal: number;
  discount: number;
  items: CartItem[];
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  amountReceived: number;
  splitDetails?: { cash: number; transfer: number };
  orderData?: any;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "cash", label: "Efectivo", icon: <DollarSign className="w-5 h-5" /> },
  { value: "card", label: "Tarjeta", icon: <CreditCard className="w-5 h-5" /> },
  { value: "transfer", label: "Transferencia", icon: <Smartphone className="w-5 h-5" /> },
  { value: "split", label: "Mixto", icon: <div className="flex"><DollarSign className="w-3.5 h-3.5" /><Smartphone className="w-3.5 h-3.5" /></div> },
  { value: "qr", label: "QR", icon: <QrCode className="w-5 h-5" /> },
];

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
  const [splitMode, setSplitMode] = useState<"even" | "items">("even");
  const [evenCount, setEvenCount] = useState<number>(2);
  const [evenClients, setEvenClients] = useState<SplitClient[]>([]);
  const [itemsClients, setItemsClients] = useState<SplitClient[]>([]);
  const [activePaymentIndex, setActivePaymentIndex] = useState<number | null>(null);

  // Active Payment Form State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [mixCash, setMixCash] = useState<string>("");
  const [mixTransfer, setMixTransfer] = useState<string>("");
  const [isSubmitProcessing, setIsSubmitProcessing] = useState<boolean>(false);
  const [viewingReceiptIndex, setViewingReceiptIndex] = useState<number | null>(null);

  // Initialize Split Clients
  useEffect(() => {
    if (isOpen) {
      setActivePaymentIndex(null);
      setViewingReceiptIndex(null);
      
      // Initialize Even Split
      updateEvenSplits(evenCount);

      // Initialize Items Split with 2 clients
      setItemsClients([
        { id: "1", name: "Cliente 1", amount: 0, subtotal: 0, discount: 0, items: [], paid: false, paymentMethod: null, amountReceived: 0 },
        { id: "2", name: "Cliente 2", amount: 0, subtotal: 0, discount: 0, items: [], paid: false, paymentMethod: null, amountReceived: 0 }
      ]);
    }
  }, [isOpen, total, subtotal, discountAmount, cart]);

  const updateEvenSplits = (count: number) => {
    const splitTotal = Math.round(total / count);
    const splitSubtotal = Math.round(subtotal / count);
    const splitDiscount = Math.round(discountAmount / count);

    const clients: SplitClient[] = Array.from({ length: count }, (_, i) => {
      // The last client absorbs rounding differences
      const isLast = i === count - 1;
      const clientAmount = isLast ? total - (splitTotal * (count - 1)) : splitTotal;
      const clientSubtotal = isLast ? subtotal - (splitSubtotal * (count - 1)) : splitSubtotal;
      const clientDiscount = isLast ? discountAmount - (splitDiscount * (count - 1)) : splitDiscount;

      // We split item quantities equally
      const clientItems = cart.map(item => ({
        ...item,
        quantity: item.quantity / count
      }));

      return {
        id: `even-${i + 1}`,
        name: `Cliente ${i + 1}`,
        amount: clientAmount,
        subtotal: clientSubtotal,
        discount: clientDiscount,
        items: clientItems,
        paid: false,
        paymentMethod: null,
        amountReceived: 0
      };
    });
    setEvenClients(clients);
  };

  const handleEvenCountChange = (delta: number) => {
    const newCount = Math.max(2, Math.min(10, evenCount + delta));
    setEvenCount(newCount);
    updateEvenSplits(newCount);
  };

  // Helper to get quantities assigned to all clients for a specific cart item
  const getAssignedQuantity = (itemId: string, clientsList: SplitClient[]) => {
    return clientsList.reduce((sum, client) => {
      const clientItem = client.items.find(i => i.id === itemId);
      return sum + (clientItem ? clientItem.quantity : 0);
    }, 0);
  };

  const getUnassignedQuantity = (itemId: string, clientsList: SplitClient[]) => {
    const originalItem = cart.find(i => i.id === itemId);
    if (!originalItem) return 0;
    const assigned = getAssignedQuantity(itemId, clientsList);
    // Use floating precision protection
    const diff = originalItem.quantity - assigned;
    return diff > 0.001 ? Math.round(diff * 100) / 100 : 0;
  };

  // Check if all items are fully assigned across clients
  const isEverythingAssigned = useMemo(() => {
    return cart.every(item => getUnassignedQuantity(item.id, itemsClients) <= 0);
  }, [cart, itemsClients]);

  // Update client totals based on assigned items
  const recalculateItemsClients = (clients: SplitClient[]): SplitClient[] => {
    return clients.map(client => {
      const clientSubtotal = client.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Proportional discount allocation
      const proportion = subtotal > 0 ? (clientSubtotal / subtotal) : 0;
      const clientDiscount = Math.round(discountAmount * proportion);
      const clientTotal = Math.max(0, clientSubtotal - clientDiscount);

      return {
        ...client,
        subtotal: clientSubtotal,
        discount: clientDiscount,
        amount: clientTotal
      };
    });
  };

  const handleAdjustItemQuantity = (clientIndex: number, itemId: string, delta: number) => {
    const client = itemsClients[clientIndex];
    if (client.paid) return;

    const originalItem = cart.find(i => i.id === itemId);
    if (!originalItem) return;

    const currentClientItem = client.items.find(i => i.id === itemId);
    const currentQtyInClient = currentClientItem ? currentClientItem.quantity : 0;

    const nextQty = currentQtyInClient + delta;
    if (nextQty < 0) return;

    if (delta > 0) {
      // Check if we have unassigned stock available
      const unassigned = getUnassignedQuantity(itemId, itemsClients);
      if (unassigned <= 0) {
        toast.warning("No hay más unidades disponibles de este producto");
        return;
      }
    }

    let updatedItems = [...client.items];
    if (nextQty === 0) {
      updatedItems = updatedItems.filter(i => i.id !== itemId);
    } else {
      const itemIndex = updatedItems.findIndex(i => i.id === itemId);
      if (itemIndex >= 0) {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity: nextQty };
      } else {
        updatedItems.push({ ...originalItem, quantity: nextQty });
      }
    }

    const updatedClients = itemsClients.map((c, idx) => {
      if (idx === clientIndex) {
        return { ...c, items: updatedItems };
      }
      return c;
    });

    setItemsClients(recalculateItemsClients(updatedClients));
  };

  const handleAddClient = () => {
    if (itemsClients.length >= 6) {
      toast.warning("Máximo 6 clientes en división por artículos");
      return;
    }
    const newClient: SplitClient = {
      id: (itemsClients.length + 1).toString(),
      name: `Cliente ${itemsClients.length + 1}`,
      amount: 0,
      subtotal: 0,
      discount: 0,
      items: [],
      paid: false,
      paymentMethod: null,
      amountReceived: 0
    };
    setItemsClients([...itemsClients, newClient]);
  };

  const handleRemoveClient = (clientIndex: number) => {
    const client = itemsClients[clientIndex];
    if (client.paid) {
      toast.error("No se puede eliminar un cliente que ya ha pagado");
      return;
    }

    const updatedClients = itemsClients.filter((_, idx) => idx !== clientIndex);
    // Reindex clients to keep names clean
    const reindexedClients = updatedClients.map((c, idx) => ({
      ...c,
      name: `Cliente ${idx + 1}`
    }));
    setItemsClients(recalculateItemsClients(reindexedClients));
  };

  const handleOpenPayment = (index: number) => {
    const clientsList = splitMode === "even" ? evenClients : itemsClients;
    const client = clientsList[index];
    if (client.paid) return;

    setActivePaymentIndex(index);
    setSelectedMethod("cash");
    setCashReceived(Math.round(client.amount).toString());
    setMixCash("");
    setMixTransfer("");
  };

  const handleCancelPayment = () => {
    setActivePaymentIndex(null);
  };

  const handleConfirmClientPayment = async () => {
    if (activePaymentIndex === null) return;
    
    const clientsList = splitMode === "even" ? evenClients : itemsClients;
    const client = clientsList[activePaymentIndex];
    const finalTotal = client.amount;

    // Validation
    if (selectedMethod === "cash" && parseFloat(cashReceived || "0") < finalTotal) {
      toast.error("El monto recibido es insuficiente");
      return;
    }

    if (selectedMethod === "split") {
      const cash = parseFloat(mixCash || "0");
      const transfer = parseFloat(mixTransfer || "0");
      if (Math.abs((cash + transfer) - finalTotal) > 1) {
        toast.error(`La suma de efectivo y transferencia (${formatCOP(cash + transfer)}) debe ser igual al total (${formatCOP(finalTotal)})`);
        return;
      }
    }

    setIsSubmitProcessing(true);

    try {
      const splitDetails = selectedMethod === "split" 
        ? { cash: parseFloat(mixCash || "0"), transfer: parseFloat(mixTransfer || "0") }
        : undefined;

      const amountRec = selectedMethod === "cash" ? parseFloat(cashReceived || "0") : finalTotal;

      const orderData = await processSale(
        client.items,
        client.amount,
        client.subtotal,
        client.discount,
        selectedCustomer,
        selectedMethod,
        amountRec,
        undefined, // Delivery is pickup for split bills
        splitDetails
      );

      if (orderData) {
        const updatedClient = {
          ...client,
          paid: true,
          paymentMethod: selectedMethod,
          amountReceived: amountRec,
          splitDetails,
          orderData
        };

        if (splitMode === "even") {
          setEvenClients(prev => prev.map((c, idx) => idx === activePaymentIndex ? updatedClient : c));
        } else {
          setItemsClients(prev => prev.map((c, idx) => idx === activePaymentIndex ? updatedClient : c));
        }

        toast.success(`Pago de ${client.name} procesado exitosamente`);
        setActivePaymentIndex(null);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Error al procesar el pago: " + (e.message || "Error desconocido"));
    } finally {
      setIsSubmitProcessing(false);
    }
  };

  // Derived properties
  const activeClients = splitMode === "even" ? evenClients : itemsClients;
  const isFullySettled = activeClients.length > 0 && activeClients.every(c => c.paid || (splitMode === "items" && c.items.length === 0));
  const paidCount = activeClients.filter(c => c.paid).length;
  const totalPaidAmount = activeClients.reduce((sum, c) => sum + (c.paid ? c.amount : 0), 0);

  const handleFinishCheckout = () => {
    resetCart();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Don't allow closing if we have already processed some payments but not finished
      if (!open) {
        if (paidCount > 0 && !isFullySettled) {
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

        {isFullySettled ? (
          <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center text-emerald-400">
              <Check className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black font-space-grotesk text-foreground">CUENTA TOTALMENTE PAGADA</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Se han procesado exitosamente todos los pagos parciales por un total de <span className="font-bold text-foreground">{formatCOP(total)}</span>.
              </p>
            </div>

            <div className="w-full max-w-lg border border-white/5 rounded-2xl glass-pro p-4 space-y-3">
              <p className="text-xs font-bold text-left uppercase text-muted-foreground tracking-wider pb-2 border-b border-white/5">
                Facturas Generadas ({activeClients.filter(c => c.paid).length})
              </p>
              <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-2">
                {activeClients.filter(c => c.paid).map((c, idx) => (
                  <div key={c.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="text-left">
                      <p className="text-sm font-bold">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">ID Venta: {c.orderData?.id ? c.orderData.id.slice(0, 8) : "Local"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-primary">{formatCOP(c.amount)}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-1 rounded-lg border-white/10 text-xs hover:bg-primary/20 hover:text-white"
                        onClick={() => setViewingReceiptIndex(idx)}
                      >
                        <Printer className="w-3.5 h-3.5" /> Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleFinishCheckout} className="w-full max-w-sm gradient-primary h-12 text-base font-bold shadow-glow-pro">
              Nueva Venta / Finalizar
            </Button>
          </div>
        ) : activePaymentIndex !== null ? (
          /* PAYMENT PROCESSING PANEL */
          <div className="flex-1 space-y-6 py-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <span className="text-xs uppercase font-extrabold text-primary tracking-wider">Procesando Pago</span>
                <h3 className="text-xl font-bold">{activeClients[activePaymentIndex].name}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider">Monto a pagar</span>
                <p className="text-2xl font-black text-foreground">{formatCOP(activeClients[activePaymentIndex].amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Payment Methods Choice */}
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase text-muted-foreground">Seleccione Método</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.value}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(pm.value);
                        setCashReceived(Math.round(activeClients[activePaymentIndex].amount).toString());
                        setMixCash("");
                        setMixTransfer("");
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all active:scale-95 min-h-[80px]",
                        selectedMethod === pm.value
                          ? "border-primary bg-primary/10 text-primary shadow-md"
                          : "border-white/10 hover:border-white/35 text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      {pm.icon}
                      <span className="font-bold text-xs">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input details based on selected method */}
              <div className="flex flex-col justify-center bg-muted/20 border border-white/5 rounded-2xl p-6">
                {selectedMethod === "cash" && (
                  <div className="space-y-4 w-full">
                    <Label htmlFor="cash-received" className="text-xs font-bold uppercase text-primary">Monto Recibido</Label>
                    <Input
                      id="cash-received"
                      type="number"
                      step="1000"
                      value={cashReceived}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCashReceived(val < 0 ? "0" : e.target.value);
                      }}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          setCashReceived((Math.round(val / 1000) * 1000).toString());
                        }
                      }}
                      className="text-2xl font-black border-2 border-primary/20 h-14 bg-black/20 text-center"
                      placeholder="0"
                    />

                    {parseFloat(cashReceived || "0") >= activeClients[activePaymentIndex].amount && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Cambio a Devolver</p>
                        <p className="text-2xl font-black text-emerald-400">
                          {formatCOP(parseFloat(cashReceived || "0") - activeClients[activePaymentIndex].amount)}
                        </p>
                      </div>
                    )}
                    {parseFloat(cashReceived || "0") > 0 && parseFloat(cashReceived || "0") < activeClients[activePaymentIndex].amount && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                        <p className="text-xs text-rose-400 font-bold uppercase">Monto insuficiente</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Falta: {formatCOP(activeClients[activePaymentIndex].amount - parseFloat(cashReceived || "0"))}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedMethod === "split" && (
                  <div className="space-y-4 w-full">
                    <p className="text-xs text-muted-foreground uppercase font-bold text-center border-b border-white/5 pb-2">
                      Pago Mixto (Efectivo + Transferencia)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="split-cash" className="text-[10px] font-bold uppercase text-muted-foreground">Efectivo</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            id="split-cash"
                            type="number"
                            step="1000"
                            value={mixCash}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numericVal = parseFloat(val || "0");
                              if (numericVal < 0) return;
                              setMixCash(val);
                              if (numericVal <= activeClients[activePaymentIndex].amount) {
                                setMixTransfer((Math.round(activeClients[activePaymentIndex].amount - numericVal)).toString());
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setMixCash((Math.round(val / 1000) * 1000).toString());
                              }
                            }}
                            className="pl-7 font-extrabold h-11 bg-black/20 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="split-transfer" className="text-[10px] font-bold uppercase text-muted-foreground">Transferencia</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                          <Input
                            id="split-transfer"
                            type="number"
                            step="1000"
                            value={mixTransfer}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numericVal = parseFloat(val || "0");
                              if (numericVal < 0) return;
                              setMixTransfer(val);
                              if (numericVal <= activeClients[activePaymentIndex].amount) {
                                setMixCash((Math.round(activeClients[activePaymentIndex].amount - numericVal)).toString());
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val)) {
                                setMixTransfer((Math.round(val / 1000) * 1000).toString());
                              }
                            }}
                            className="pl-7 font-extrabold h-11 bg-black/20 text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Suma registrada:</span>
                      <span className={cn(
                        "font-black",
                        Math.abs((parseFloat(mixCash || "0") + parseFloat(mixTransfer || "0")) - activeClients[activePaymentIndex].amount) < 1 
                          ? "text-emerald-400" 
                          : "text-rose-400"
                      )}>
                        {formatCOP(parseFloat(mixCash || "0") + parseFloat(mixTransfer || "0"))} 
                        / {formatCOP(activeClients[activePaymentIndex].amount)}
                      </span>
                    </div>
                  </div>
                )}

                {selectedMethod !== "cash" && selectedMethod !== "split" && (
                  <div className="text-center space-y-2 py-4">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Confirmar recepción de pago</p>
                    <p className="text-sm font-medium">
                      Método: <span className="capitalize font-bold text-primary">{selectedMethod}</span>
                    </p>
                    <p className="text-xl font-bold">{formatCOP(activeClients[activePaymentIndex].amount)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button variant="outline" onClick={handleCancelPayment} disabled={isSubmitProcessing}>
                Volver
              </Button>
              <Button 
                onClick={handleConfirmClientPayment} 
                disabled={isSubmitProcessing}
                className="gradient-primary h-11 min-w-[150px] font-bold"
              >
                {isSubmitProcessing ? "Procesando..." : "Confirmar Pago"}
              </Button>
            </div>
          </div>
        ) : (
          /* SELECTION & ALLOCATION STAGE */
          <div className="flex-1 flex flex-col min-h-0 space-y-6">
            {paidCount > 0 && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs text-primary font-bold">
                <span>PAGOS PROCESADOS: {paidCount} / {activeClients.length}</span>
                <span>TOTAL RECAUDADO: {formatCOP(totalPaidAmount)} / {formatCOP(total)}</span>
              </div>
            )}

            <Tabs defaultValue="even" value={splitMode} onValueChange={(val) => {
              if (paidCount > 0) {
                toast.warning("No se puede cambiar el modo de división una vez iniciado el cobro");
                return;
              }
              setSplitMode(val as "even" | "items");
            }} className="w-full flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-black/20 border border-white/5 rounded-xl">
                <TabsTrigger value="even" className="gap-2 font-bold font-space-grotesk text-xs tracking-wider uppercase">
                  <Users className="w-4 h-4" /> Dividir por Partes Iguales
                </TabsTrigger>
                <TabsTrigger value="items" className="gap-2 font-bold font-space-grotesk text-xs tracking-wider uppercase">
                  <Split className="w-4 h-4" /> Dividir por Artículos
                </TabsTrigger>
              </TabsList>

              {/* EVEN SPLIT CONTENT */}
              <TabsContent value="even" className="flex-1 flex flex-col justify-between pt-4 min-h-0">
                <div className="space-y-6">
                  {/* Div Count Selector */}
                  <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div>
                      <p className="font-bold text-sm">¿En cuántas partes dividimos?</p>
                      <p className="text-muted-foreground text-xs mt-0.5">El valor se distribuirá en partes iguales.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-10 w-10 rounded-xl border-white/10" 
                        onClick={() => handleEvenCountChange(-1)}
                        disabled={evenCount <= 2 || paidCount > 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-black font-space-grotesk w-8 text-center">{evenCount}</span>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-10 w-10 rounded-xl border-white/10" 
                        onClick={() => handleEvenCountChange(1)}
                        disabled={evenCount >= 10 || paidCount > 0}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Even Split Clients List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto custom-scrollbar p-1">
                    {evenClients.map((client, idx) => (
                      <div 
                        key={client.id} 
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[120px] relative overflow-hidden",
                          client.paid 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                            : "bg-white/5 border-white/5 hover:border-white/15"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase font-bold">Cuenta Partida {idx + 1}</span>
                            <h4 className="font-bold text-base text-foreground mt-0.5">{client.name}</h4>
                          </div>
                          {client.paid ? (
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1.5 border border-emerald-500/25">
                              <Check className="w-3.5 h-3.5" /> Pagado
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/15">
                              Pendiente
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-end mt-4">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Monto</p>
                            <p className="text-lg font-black text-foreground">{formatCOP(client.amount)}</p>
                          </div>

                          {!client.paid && (
                            <Button 
                              onClick={() => handleOpenPayment(idx)}
                              size="sm" 
                              className="gradient-primary h-8 rounded-lg text-xs font-bold px-3 gap-1 shadow-sm active:scale-95"
                            >
                              Cobrar <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* ITEMS SPLIT CONTENT */}
              <TabsContent value="items" className="flex-1 flex flex-col min-h-0 pt-4">
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                  {/* Left Column: Cart items allocation */}
                  <div className="lg:col-span-6 flex flex-col min-h-0 bg-white/5 border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                      <p className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" /> Distribución de Productos
                      </p>
                      {isEverythingAssigned ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold uppercase">
                          Todo Asignado
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                          Pendiente de Asignar
                        </span>
                      )}
                    </div>

                    {/* Products Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                      {cart.map((item) => {
                        const unassigned = getUnassignedQuantity(item.id, itemsClients);
                        return (
                          <div key={item.id} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-foreground leading-tight">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Cant: {item.quantity} × {formatCOP(item.price)}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                                  unassigned > 0 
                                    ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                                )}>
                                  Disp: {unassigned}
                                </span>
                              </div>
                            </div>

                            {/* Client list inline to allot */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                              {itemsClients.map((client, idx) => {
                                const clientItem = client.items.find(i => i.id === item.id);
                                const clientQty = clientItem ? clientItem.quantity : 0;
                                return (
                                  <div key={client.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                                    <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[60px]">
                                      {client.name}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustItemQuantity(idx, item.id, -1)}
                                        disabled={clientQty <= 0 || client.paid}
                                        className="h-5 w-5 bg-white/5 hover:bg-white/10 rounded flex items-center justify-center text-[10px] font-bold disabled:opacity-30 transition-colors"
                                      >
                                        -
                                      </button>
                                      <span className="text-[10px] font-black w-3 text-center">{clientQty}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustItemQuantity(idx, item.id, 1)}
                                        disabled={unassigned <= 0 || client.paid}
                                        className="h-5 w-5 bg-white/5 hover:bg-white/10 rounded flex items-center justify-center text-[10px] font-bold disabled:opacity-30 transition-colors"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Clients and checkouts */}
                  <div className="lg:col-span-6 flex flex-col min-h-0 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <p className="text-xs font-extrabold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Clientes Compartiendo ({itemsClients.length})
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleAddClient} 
                        disabled={itemsClients.length >= 6 || paidCount > 0}
                        className="h-7 px-2.5 rounded-lg border-white/10 text-[10px] font-bold gap-1 uppercase"
                      >
                        <Plus className="w-3 h-3" /> Agregar Cliente
                      </Button>
                    </div>

                    {/* Scrollable list of clients */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                      {itemsClients.map((client, idx) => (
                        <div 
                          key={client.id}
                          className={cn(
                            "p-3 rounded-xl border flex flex-col justify-between transition-all",
                            client.paid
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-white/5 border-white/5 hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{client.name}</h4>
                              {client.items.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground mt-0.5">Sin productos asignados</p>
                              ) : (
                                <p className="text-[10px] text-primary mt-0.5 font-bold">
                                  {client.items.reduce((sum, i) => sum + i.quantity, 0)} Productos asignados
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {client.paid ? (
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/25">
                                  Pagado
                                </span>
                              ) : (
                                <>
                                  {itemsClients.length > 2 && !client.paid && paidCount === 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveClient(idx)}
                                      className="text-xs text-rose-400 hover:text-rose-300 uppercase font-bold hover:underline"
                                    >
                                      Quitar
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Client Items summary inline */}
                          {client.items.length > 0 && (
                            <div className="mt-2 bg-black/10 p-2 rounded border border-white/5 max-h-[80px] overflow-y-auto custom-scrollbar text-[10px] space-y-1">
                              {client.items.map(i => (
                                <div key={i.id} className="flex justify-between text-muted-foreground">
                                  <span>{i.quantity}× {i.name}</span>
                                  <span>{formatCOP(i.price * i.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex justify-between items-end mt-3 pt-2 border-t border-white/5">
                            <div>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Subtotal: {formatCOP(client.subtotal)}</span>
                              <p className="text-sm font-black text-foreground">{formatCOP(client.amount)}</p>
                            </div>
                            {!client.paid && client.items.length > 0 && (
                              <Button
                                size="sm"
                                disabled={!isEverythingAssigned}
                                onClick={() => handleOpenPayment(idx)}
                                className={cn(
                                  "h-8 rounded-lg text-xs font-bold px-3 gap-1 shadow-sm transition-all active:scale-95",
                                  isEverythingAssigned ? "gradient-primary" : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                                )}
                              >
                                Cobrar <ArrowRight className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {!isEverythingAssigned && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 flex items-start gap-2.5 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Asignación Pendiente</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Para poder cobrar a los clientes, distribuye primero todas las unidades de los productos en el panel izquierdo.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter className="border-t border-white/10 pt-4 flex sm:justify-between items-center gap-4">
          <div className="text-xs text-muted-foreground font-medium text-left">
            Pagos parciales: <span className="font-bold text-foreground">{paidCount}</span> de <span className="font-bold text-foreground">{activeClients.length}</span> cobrados.
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={paidCount > 0 && !isFullySettled}
            >
              Cancelar / Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* SINGLE RECEIPT PREVIEW DIALOG ON COMPLETION */}
      {viewingReceiptIndex !== null && activeClients[viewingReceiptIndex]?.orderData && (
        <Dialog open={true} onOpenChange={() => setViewingReceiptIndex(null)}>
          <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto custom-scrollbar p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-center font-bold">Comprobante de Pago</DialogTitle>
              <DialogDescription className="text-center text-xs">
                {activeClients[viewingReceiptIndex].name} - Cuenta Dividida
              </DialogDescription>
            </DialogHeader>

            {(() => {
              const client = activeClients[viewingReceiptIndex];
              const order = client.orderData;
              return (
                <div className="space-y-4 py-3 text-sm">
                  <div className="text-center p-4 bg-muted/40 rounded-xl">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Total Pagado</p>
                    <p className="text-3xl font-black text-primary">{formatCOP(client.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-1 capitalize">
                      Método: {client.paymentMethod === 'cash' && '💵 Efectivo'}
                      {client.paymentMethod === 'card' && '💳 Tarjeta'}
                      {client.paymentMethod === 'transfer' && '📱 Transferencia'}
                      {client.paymentMethod === 'qr' && '🤳 QR'}
                      {client.paymentMethod === 'split' && '🌓 Mixto (Efe + Tra)'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-xs uppercase text-muted-foreground border-b pb-1">Detalle de Productos:</p>
                    {client.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-xs py-1">
                        <span>{Math.round(item.quantity * 100) / 100}x {item.name}</span>
                        <span className="font-bold">{formatCOP(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-dashed border-white/10 text-center text-xs text-muted-foreground space-y-1">
                    <p>Orden #{order.id.slice(0, 8)}</p>
                    <p>{new Date(order.created_at).toLocaleString('es')}</p>
                  </div>
                </div>
              );
            })()}

            <DialogFooter>
              <Button onClick={() => setViewingReceiptIndex(null)} className="w-full gradient-primary">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}

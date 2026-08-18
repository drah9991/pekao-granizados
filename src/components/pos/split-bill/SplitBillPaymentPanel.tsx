import type { ReactNode } from "react";
import { CreditCard, DollarSign, Smartphone, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/components/pos/PaymentDialog";
import type { SplitClient } from "@/hooks/useSplitBill";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: ReactNode }[] = [
  { value: "cash", label: "Efectivo", icon: <DollarSign className="w-5 h-5" /> },
  { value: "card", label: "Tarjeta", icon: <CreditCard className="w-5 h-5" /> },
  { value: "transfer", label: "Transferencia", icon: <Smartphone className="w-5 h-5" /> },
  { value: "split", label: "Mixto", icon: <div className="flex"><DollarSign className="w-3.5 h-3.5" /><Smartphone className="w-3.5 h-3.5" /></div> },
  { value: "qr", label: "QR", icon: <QrCode className="w-5 h-5" /> },
];

interface SplitBillPaymentPanelProps {
  activeClients: SplitClient[];
  activePaymentIndex: number;
  selectedMethod: PaymentMethod;
  onSelectMethod: (method: PaymentMethod) => void;
  cashReceived: string;
  setCashReceived: (v: string) => void;
  mixCash: string;
  setMixCash: (v: string) => void;
  mixTransfer: string;
  setMixTransfer: (v: string) => void;
  isSubmitProcessing: boolean;
  onCancelPayment: () => void;
  onConfirmPayment: () => void;
}

/**
 * Panel de procesamiento de pago de un cliente de SplitBillDialog.tsx,
 * extraído sin cambios de comportamiento.
 */
export function SplitBillPaymentPanel({
  activeClients,
  activePaymentIndex,
  selectedMethod,
  onSelectMethod,
  cashReceived,
  setCashReceived,
  mixCash,
  setMixCash,
  mixTransfer,
  setMixTransfer,
  isSubmitProcessing,
  onCancelPayment,
  onConfirmPayment,
}: SplitBillPaymentPanelProps) {
  const client = activeClients[activePaymentIndex];

  return (
    <div className="flex-1 space-y-6 py-4 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <span className="text-xs uppercase font-extrabold text-primary tracking-wider">Procesando Pago</span>
          <h3 className="text-xl font-bold">{client.name}</h3>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider">Monto a pagar</span>
          <p className="text-2xl font-black text-foreground">{formatCOP(client.amount)}</p>
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
                onClick={() => onSelectMethod(pm.value)}
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

              {parseFloat(cashReceived || "0") >= client.amount && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Cambio a Devolver</p>
                  <p className="text-2xl font-black text-emerald-400">
                    {formatCOP(parseFloat(cashReceived || "0") - client.amount)}
                  </p>
                </div>
              )}
              {parseFloat(cashReceived || "0") > 0 && parseFloat(cashReceived || "0") < client.amount && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                  <p className="text-xs text-rose-400 font-bold uppercase">Monto insuficiente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Falta: {formatCOP(client.amount - parseFloat(cashReceived || "0"))}
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
                        if (numericVal <= client.amount) {
                          setMixTransfer((Math.round(client.amount - numericVal)).toString());
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
                        if (numericVal <= client.amount) {
                          setMixCash((Math.round(client.amount - numericVal)).toString());
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
                  Math.abs((parseFloat(mixCash || "0") + parseFloat(mixTransfer || "0")) - client.amount) < 1
                    ? "text-emerald-400"
                    : "text-rose-400"
                )}>
                  {formatCOP(parseFloat(mixCash || "0") + parseFloat(mixTransfer || "0"))}
                  / {formatCOP(client.amount)}
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
              <p className="text-xl font-bold">{formatCOP(client.amount)}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <Button variant="outline" onClick={onCancelPayment} disabled={isSubmitProcessing}>
          Volver
        </Button>
        <Button
          onClick={onConfirmPayment}
          disabled={isSubmitProcessing}
          className="gradient-primary h-11 min-w-[150px] font-bold"
        >
          {isSubmitProcessing ? "Procesando..." : "Confirmar Pago"}
        </Button>
      </div>
    </div>
  );
}

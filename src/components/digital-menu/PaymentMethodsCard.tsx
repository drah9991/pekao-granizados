import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface PaymentMethodsCardProps {
  paymentCash: boolean;
  setPaymentCash: (value: boolean) => void;
  paymentTransfer: boolean;
  setPaymentTransfer: (value: boolean) => void;
}

export function PaymentMethodsCard({
  paymentCash,
  setPaymentCash,
  paymentTransfer,
  setPaymentTransfer
}: PaymentMethodsCardProps) {
  return (
    <Card className="lg:col-span-6 bg-slate-950/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
      <CardHeader className="p-0 pb-4 mb-4 border-b border-white/5">
        <CardTitle className="text-sm font-black italic uppercase font-space-grotesk tracking-widest text-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-cyan-400" />
          Medios de Pago Aceptados
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex items-center gap-12 py-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="pay-cash"
            checked={paymentCash}
            onChange={(e) => setPaymentCash(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary focus:ring-0 cursor-pointer"
          />
          <Label htmlFor="pay-cash" className="text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer">Efectivo</Label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="pay-transfer"
            checked={paymentTransfer}
            onChange={(e) => setPaymentTransfer(e.target.checked)}
            className="w-4 h-4 rounded border-white/10 bg-slate-900 text-primary focus:ring-0 cursor-pointer"
          />
          <Label htmlFor="pay-transfer" className="text-xs font-bold uppercase tracking-wider text-slate-300 cursor-pointer">Transferencia</Label>
        </div>
      </CardContent>
    </Card>
  );
}

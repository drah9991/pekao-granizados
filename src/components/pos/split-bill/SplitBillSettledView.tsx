import { Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCOP } from "@/lib/currency";
import type { SplitClient } from "@/hooks/useSplitBill";

interface SplitBillSettledViewProps {
  total: number;
  activeClients: SplitClient[];
  onViewReceipt: (idx: number) => void;
  onFinishCheckout: () => void;
}

/**
 * Vista de "cuenta totalmente pagada" de SplitBillDialog.tsx, extraída sin
 * cambios de comportamiento.
 */
export function SplitBillSettledView({ total, activeClients, onViewReceipt, onFinishCheckout }: SplitBillSettledViewProps) {
  return (
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
                  onClick={() => onViewReceipt(idx)}
                >
                  <Printer className="w-3.5 h-3.5" /> Ver
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={onFinishCheckout} className="w-full max-w-sm gradient-primary h-12 text-base font-bold shadow-glow-pro">
        Nueva Venta / Finalizar
      </Button>
    </div>
  );
}

import { Minus, Plus, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { SplitClient } from "@/hooks/useSplitBill";

interface EvenSplitTabProps {
  evenCount: number;
  evenClients: SplitClient[];
  paidCount: number;
  onEvenCountChange: (delta: number) => void;
  onOpenPayment: (idx: number) => void;
}

/**
 * Tab "Dividir por Partes Iguales" de SplitBillDialog.tsx, extraída sin
 * cambios de comportamiento.
 */
export function EvenSplitTab({ evenCount, evenClients, paidCount, onEvenCountChange, onOpenPayment }: EvenSplitTabProps) {
  return (
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
              onClick={() => onEvenCountChange(-1)}
              disabled={evenCount <= 2 || paidCount > 0}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-2xl font-black font-space-grotesk w-8 text-center">{evenCount}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-xl border-white/10"
              onClick={() => onEvenCountChange(1)}
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
                    onClick={() => onOpenPayment(idx)}
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
  );
}

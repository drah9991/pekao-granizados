import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { StockItem } from "@/types/inventory";

interface InventoryDialogsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: StockItem | null;
  adjustmentType: "add" | "subtract";
  setAdjustmentType: (type: "add" | "subtract") => void;
  adjustmentQty: string;
  setAdjustmentQty: (val: string) => void;
  adjustmentReason: string;
  setAdjustmentReason: (val: string) => void;
  isProcessing: boolean;
  onConfirm: () => void;
}

export function InventoryDialogs({
  isOpen,
  onClose,
  selectedItem,
  adjustmentType,
  setAdjustmentType,
  adjustmentQty,
  setAdjustmentQty,
  adjustmentReason,
  setAdjustmentReason,
  isProcessing,
  onConfirm
}: InventoryDialogsProps) {
  if (!selectedItem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto custom-scrollbar glass-pro border-border rounded-[3rem] text-foreground shadow-pro">
        <DialogHeader className="mb-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-glow-pro transition-colors",
              adjustmentType === "add" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
            )}>
              {adjustmentType === "add" ? <Plus className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
            </div>
            <div>
              <DialogTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">
                Sincronización de Stock
              </DialogTitle>
              <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">
                {selectedItem.product.name} • Protocolo de Ajuste Manual
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <div className="grid grid-cols-2 gap-6">
            <Button
              onClick={() => setAdjustmentType("add")}
              className={cn(
                "h-20 rounded-3xl font-black italic uppercase tracking-widest text-[11px] transition-all gap-3 border-2 font-space-grotesk shadow-pro",
                adjustmentType === "add" ? "bg-emerald-500 text-primary-foreground border-emerald-400 shadow-emerald-500/20" : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
              )}
            >
              <TrendingUp className="w-5 h-5" /> Ingesta (+ Saldo)
            </Button>
            <Button
              onClick={() => setAdjustmentType("subtract")}
              className={cn(
                "h-20 rounded-3xl font-black italic uppercase tracking-widest text-[11px] transition-all gap-3 border-2 font-space-grotesk shadow-pro",
                adjustmentType === "subtract" ? "bg-rose-500 text-primary-foreground border-rose-400 shadow-rose-500/20" : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
              )}
            >
              <TrendingDown className="w-5 h-5" /> Egreso (- Saldo)
            </Button>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">CANTIDAD OPERATIVA</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                className="h-16 bg-muted/40 border-border rounded-2xl text-2xl font-black italic font-space-grotesk focus:ring-primary/20 text-center"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">MOTIVO DE REGISTRO</Label>
              <Textarea
                placeholder="DETALLE DE MOVIMIENTO (EJ. REABASTECIMIENTO, MERMA, SEGUIMIENTO)..."
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value.toUpperCase())}
                className="bg-muted/40 border-border rounded-2xl text-xs font-black italic focus:ring-primary/20 min-h-[120px] uppercase p-6"
              />
            </div>
          </div>

          <div className="p-10 border border-white/5 bg-white/[0.02] rounded-[2.5rem] relative overflow-hidden group">
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black text-muted-foreground/20 uppercase tracking-widest mb-1 italic">PROYECCIÓN FINAL</p>
                <div className="text-5xl font-black font-space-grotesk italic tracking-tighter text-foreground">
                  {adjustmentQty ? 
                    (adjustmentType === "add" ? selectedItem.qty + parseFloat(adjustmentQty) : Math.max(0, selectedItem.qty - parseFloat(adjustmentQty))) 
                    : selectedItem.qty}
                  <span className="text-sm text-primary font-bold not-italic ml-2 animate-pulse">UNITS</span>
                </div>
              </div>
              <ShieldCheck className="w-12 h-12 text-primary opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-4 pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 h-16 rounded-2xl text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/40 hover:text-foreground hover:bg-muted"
          >
            CANCELAR OPERACIÓN
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isProcessing || !adjustmentQty}
            className="flex-[2] h-16 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest shadow-glow-pro hover:bg-primary/80 transition-all font-space-grotesk"
          >
            {isProcessing ? "SINCRONIZANDO..." : "VALIDAR Y AJUSTAR ✓"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

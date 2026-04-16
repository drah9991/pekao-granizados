import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Droplets, Calculator, Info, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  unit_of_measure: string;
  stock: number;
}

interface MixReloadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mixes: InventoryItem[];
  storeId: string;
  onSuccess: () => void;
}

const CUP_YIELD_BASE_ML = 300; // Standard 12oz cup base for Peako

export default function MixReloadDialog({ isOpen, onOpenChange, mixes, storeId, onSuccess }: MixReloadDialogProps) {
  const [selectedMixId, setSelectedMixId] = useState<string>("");
  const [liters, setLiters] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedMix = mixes.find(m => m.id === selectedMixId);
  const mlConverted = (parseFloat(liters) || 0) * 1000;
  const expectedCups = Math.floor(mlConverted / CUP_YIELD_BASE_ML);

  const handleSave = async () => {
    if (!selectedMixId || !liters || parseFloat(liters) <= 0) {
      toast.error("Por favor completa los campos correctamente");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Record the preparation in history
      const { error: prepError } = await supabase
        .from("mix_preparations")
        .insert({
          inventory_item_id: selectedMixId,
          store_id: storeId,
          liters: parseFloat(liters),
          ml_converted: mlConverted,
          expected_cups: expectedCups,
          notes: notes,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (prepError) throw prepError;

      // 2. Atomic increment of stock via RPC
      const { error: rpcError } = await supabase.rpc("increment_inventory_stock", {
        p_item_id: selectedMixId,
        p_store_id: storeId,
        p_amount: mlConverted
      });

      if (rpcError) throw rpcError;

      toast.success(`Mezcla ${selectedMix?.name} recargada con éxito (+${liters}L)`);
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error saving mix reload:", error);
      toast.error("Error al registrar preparación: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedMixId("");
    setLiters("");
    setNotes("");
  };

  return     <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-pro border-white/20 shadow-pro overflow-hidden p-0 rounded-[2.5rem] animate-pro-in">
        {/* Header with Background Accent */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-8 border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Droplets className="w-32 h-32 -rotate-12 translate-x-6 -translate-y-6 text-primary" />
          </div>
          <div className="relative flex items-center gap-4 mb-3">
            <div className="p-3 bg-primary/20 rounded-2xl text-primary border border-primary/20 shadow-glow-pro">
              <Droplets className="w-7 h-7" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-black font-space-grotesk tracking-tighter italic uppercase text-white">
                RECARGA <span className="text-primary text-glow">MAESTRA</span>
              </DialogTitle>
              <DialogDescription className="text-primary font-black uppercase text-[10px] tracking-widest mt-1">
                Ingreso volumétrico de mezcla pura
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Flavor Selection */}
          <div className="space-y-3">
            <Label htmlFor="mix" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk">
              Sabor de la Mezcla
            </Label>
            <Select value={selectedMixId} onValueChange={setSelectedMixId}>
              <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/30 font-dm-sans transition-all hover:bg-white/10">
                <SelectValue placeholder="Selecciona el sabor para recargar..." />
              </SelectTrigger>
              <SelectContent className="glass-pro border-white/10">
                {mixes.map((mix) => (
                  <SelectItem key={mix.id} value={mix.id} className="focus:bg-primary/20 cursor-pointer h-12 uppercase font-black text-[10px] tracking-widest">
                    <div className="flex items-center justify-between w-full gap-8">
                      <span className="text-white">{mix.name}</span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-lg text-primary/60">
                        {Math.floor(mix.stock / 1000)} L ACTUAL
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Liters Input */}
            <div className="space-y-3">
              <Label htmlFor="liters" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk">
                Cantidad (Liters)
              </Label>
              <div className="relative group">
                <Input
                  id="liters"
                  type="number"
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl font-black text-2xl focus:border-primary/50 text-white font-space-grotesk italic pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-primary pointer-events-none font-black italic">L</span>
              </div>
            </div>

            {/* Conversion Display */}
            <div className="p-4 glass-pro rounded-2xl flex flex-col justify-center border border-white/5 shadow-inner">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">DATA CONVERSION</p>
                <p className="text-xl font-black font-space-grotesk italic text-primary">
                    {mlConverted.toLocaleString()} <span className="text-xs not-italic text-white opacity-40">ml</span>
                </p>
            </div>
          </div>

          {/* Smart Equivalence Card (Pro Max) */}
          <div className={cn(
            "relative overflow-hidden p-6 rounded-[2rem] border transition-all duration-700 shadow-pro",
            liters 
              ? "bg-gradient-to-br from-emerald-500/10 to-primary/10 border-emerald-500/30 shadow-glow-pro" 
              : "bg-white/5 border-white/5 opacity-30 grayscale"
          )}>
            <div className="absolute -right-6 -top-6 p-4 opacity-10">
                 <Calculator className="w-24 h-24 text-emerald-400 -rotate-12" />
            </div>
            <div className="relative flex items-center gap-6">
                <div className="flex-1">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3 font-space-grotesk italic">RENDIMIENTO PROYECTADO</p>
                    <div className="flex items-end gap-2">
                        <p className="text-4xl font-black font-space-grotesk italic text-white tracking-tighter">
                            ~{expectedCups}
                        </p>
                        <p className="text-xs font-black text-white/40 mb-1 uppercase tracking-widest uppercase">Vasos 12oz</p>
                    </div>
                </div>
                <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-700 shadow-inner",
                    liters ? "bg-emerald-500/20 shadow-glow" : "bg-white/5"
                )}>
                    <CheckCircle2 className={cn("w-7 h-7 text-emerald-400 transition-all", liters ? "scale-110 opacity-100" : "scale-75 opacity-20")} />
                </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 font-space-grotesk">
              Notas de Producción
            </Label>
            <Textarea
              id="notes"
              placeholder="Detalles sobre el lote, temperatura o encargado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white/5 border-white/10 rounded-2xl focus:border-primary/50 min-h-[80px] font-dm-sans placeholder:italic"
            />
          </div>
        </div>

        <DialogFooter className="p-8 pt-0 flex gap-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-[1.5rem] text-muted-foreground hover:bg-white/5 font-black uppercase tracking-widest text-[10px] h-14 font-space-grotesk"
            disabled={isProcessing}
          >
            CANCELAR
          </Button>
          <Button
            onClick={handleSave}
            disabled={isProcessing || !liters || !selectedMixId}
            className="flex-1 rounded-[1.5rem] bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-glow-pro active:scale-95 transition-all h-14 font-space-grotesk italic border-2 border-white/20"
          >
            {isProcessing ? (
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    SYNCING...
                </div>
            ) : "CONFIRMAR PRODUCCIÓN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Percent, Coins, ChefHat, Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: { id: string; name: string }[];
  storeId: string | null;
  onSuccess?: () => void;
}

type ConfigType = "tax" | "price" | "zone" | "promo";

export default function AdvancedConfigDialog({
  isOpen,
  onClose,
  categories,
  storeId,
  onSuccess
}: AdvancedConfigDialogProps) {
  const [configType, setConfigType] = useState<ConfigType>("tax");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [isApplying, setIsApplying] = useState(false);

  // Configuration values
  const [taxRate, setTaxRate] = useState("0");
  const [priceAction, setPriceAction] = useState<"increase" | "decrease">("increase");
  const [priceType, setPriceType] = useState<"percentage" | "fixed">("percentage");
  const [priceValue, setPriceValue] = useState("");
  const [prepZone, setPrepZone] = useState("kitchen");
  const [discountVal, setDiscountVal] = useState("");

  const handleApply = async () => {
    if (!storeId) {
      toast.error("No se ha seleccionado ninguna sucursal");
      return;
    }

    setIsApplying(true);
    try {
      let query = supabase
        .from("products")
        .update({});

      // Build target attributes depending on the selected configuration type
      let updatePayload: Record<string, any> = {};

      if (configType === "tax") {
        updatePayload.tax_rate = parseFloat(taxRate) || 0;
      } else if (configType === "price") {
        const val = parseFloat(priceValue);
        if (isNaN(val)) {
          toast.error("Ingrese un valor de ajuste de precio válido");
          setIsApplying(false);
          return;
        }
        
        const multiplier = priceAction === "increase" ? 1 : -1;
        const adjustedVal = val * multiplier;

        let productQuery = supabase.from("products").select("id, price").eq("store_id", storeId);
        if (selectedCategoryId !== "all") {
          productQuery = productQuery.eq("category_id", selectedCategoryId);
        }
        const { data: prods } = await productQuery;
        if (prods && prods.length > 0) {
          const updates = prods.map(p => {
            let newPrice = p.price;
            if (priceType === "percentage") {
              newPrice = Math.round(p.price * (1 + adjustedVal / 100));
            } else {
              newPrice = Math.max(0, p.price + adjustedVal);
            }
            return supabase.from("products").update({ price: newPrice }).eq("id", p.id);
          });
          await Promise.all(updates);
          toast.success("Precios actualizados en lote exitosamente");
          if (onSuccess) onSuccess();
          onClose();
          setIsApplying(false);
          return;
        } else {
          toast.info("No hay productos en la categoría seleccionada");
          setIsApplying(false);
          return;
        }
      } else if (configType === "zone") {
        // Update preparation zone / location inside variants JSON or separate field if exists
        // Legacy support: We can save it as variants metadata
        updatePayload.variants = { prep_zone: prepZone };
      } else if (configType === "promo") {
        const disc = parseFloat(discountVal) || 0;
        updatePayload.variants = { discount_percentage: disc };
      }

      // Execute general update payload
      let updateQuery = supabase
        .from("products")
        .update(updatePayload)
        .eq("store_id", storeId);

      if (selectedCategoryId !== "all") {
        updateQuery = updateQuery.eq("category_id", selectedCategoryId);
      }

      const { error } = await updateQuery;
      if (error) throw error;

      toast.success("Configuración aplicada exitosamente en lote");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error applying batch configuration:", err);
      toast.error("Error al aplicar la configuración en lote");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto bg-[#070913] border border-[#FF007F]/40 shadow-[0_0_25px_rgba(255,0,127,0.25)] p-0 rounded-3xl text-slate-300 font-space-grotesk italic dialog-cyberpunk">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#FF007F]/20 bg-[#FF007F]/[0.02] dialog-cyberpunk-header">
          <DialogTitle className="text-lg font-black tracking-widest text-white uppercase dialog-cyberpunk-title">
            Configuración avanzada
          </DialogTitle>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          
          {/* Config Type Buttons Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Seleccione el tipo de configuración
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "tax", label: "Impuesto", icon: Percent },
                { id: "price", label: "Precio", icon: Coins },
                { id: "zone", label: "Zona comanda", icon: ChefHat },
                { id: "promo", label: "Promociones", icon: Sparkles }
              ].map((type) => {
                const Icon = type.icon;
                const isActive = configType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setConfigType(type.id as ConfigType)}
                    className={cn(
                      "h-12 flex flex-col items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer",
                      isActive
                        ? "bg-[#FF007F]/20 border-[#FF007F] text-white shadow-[0_0_12px_rgba(255,0,127,0.3)]"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Configuration Form Options */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            {configType === "tax" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa de Impuesto (%)</Label>
                <Select value={taxRate} onValueChange={setTaxRate}>
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                    <SelectValue placeholder="0%" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10">
                    <SelectItem value="0" className="text-xs font-black uppercase">Exento (0%)</SelectItem>
                    <SelectItem value="8" className="text-xs font-black uppercase">Consumo (8%)</SelectItem>
                    <SelectItem value="19" className="text-xs font-black uppercase">IVA (19%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {configType === "price" && (
              <div className="space-y-4">
                {/* Action Toggle (Aumentar / Disminuir) */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acción</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPriceAction("increase")}
                      className={cn(
                        "h-10 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                        priceAction === "increase"
                          ? "bg-[#00F0FF]/10 border-[#00F0FF] text-white shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      Aumentar (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceAction("decrease")}
                      className={cn(
                        "h-10 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer",
                        priceAction === "decrease"
                          ? "bg-red-500/10 border-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      )}
                    >
                      Disminuir (-)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Ajuste</Label>
                    <Select value={priceType} onValueChange={(val: any) => setPriceType(val)}>
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/10">
                        <SelectItem value="percentage" className="text-xs font-black uppercase">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed" className="text-xs font-black uppercase">Valor Fijo ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ajuste (Monto / %)</Label>
                    <Input
                      type="number"
                      value={priceValue}
                      onChange={(e) => setPriceValue(e.target.value)}
                      placeholder={priceType === "percentage" ? "10 para 10%" : "500 para $500"}
                      className="h-11 bg-white/5 border-white/10 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {configType === "zone" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destino de Comanda</Label>
                <Select value={prepZone} onValueChange={setPrepZone}>
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-white/10">
                    <SelectItem value="kitchen" className="text-xs font-black uppercase">Cocina</SelectItem>
                    <SelectItem value="bar" className="text-xs font-black uppercase">Barra / Bebidas</SelectItem>
                    <SelectItem value="desserts" className="text-xs font-black uppercase">Granizados / Postres</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {configType === "promo" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descuento (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountVal}
                  onChange={(e) => setDiscountVal(e.target.value)}
                  placeholder="Ej: 15 para 15% de descuento"
                  className="h-11 bg-white/5 border-white/10 rounded-lg text-xs text-white"
                />
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
                <SelectValue placeholder="- Todos -" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-white/10 max-h-56">
                <SelectItem value="all" className="text-xs font-black uppercase">- Todos -</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs font-black uppercase">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Help Warning Note */}
          <div className="flex gap-3 p-4.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-500 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="leading-relaxed">
              <span className="font-black uppercase tracking-wider block mb-1">Nota Importante:</span>
              Recuerda que la configuración se aplicará a todos los productos de la categoría seleccionada.
            </p>
          </div>

        </div>

        {/* Footer */}
        <DialogFooter className="p-8 pt-0 flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isApplying}
            className="flex-1 h-11 text-xs font-black uppercase tracking-widest rounded-xl dialog-cyberpunk-close-btn border-red-500/20 text-red-500 hover:text-white hover:bg-red-500/10"
          >
            Cerrar
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="flex-1 h-11 text-white text-xs font-black uppercase tracking-widest rounded-xl active:scale-[0.98] transition-all border-none dialog-cyberpunk-save-btn"
          >
            {isApplying ? "Aplicando..." : "Aplicar Cambios // Commit"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

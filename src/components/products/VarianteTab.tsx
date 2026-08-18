import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface VarianteTabProps {
  variantShortName: string;
  setVariantShortName: (v: string) => void;
  variantPrice: string;
  setVariantPrice: (v: string) => void;
}

/**
 * Tab "Variante" de ProductFormDialog.tsx, extraída sin cambios de
 * comportamiento.
 */
export function VarianteTab({ variantShortName, setVariantShortName, variantPrice, setVariantPrice }: VarianteTabProps) {
  return (
    <div className="space-y-6 py-4 animate-fadeIn">
      <h3 className="text-xs font-black text-center text-primary uppercase tracking-widest">¿Qué es esto?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-4 max-w-xl mx-auto">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Corto</Label>
          <Input
            value={variantShortName}
            onChange={(e) => setVariantShortName(e.target.value)}
            placeholder="Ej: Pequeño"
            className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white focus:border-primary/50"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Precio</Label>
          <Input
            type="number"
            value={variantPrice}
            onChange={(e) => setVariantPrice(e.target.value)}
            placeholder="0"
            className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black text-white focus:border-primary/50"
          />
        </div>
        <button
          type="button"
          className="bg-primary hover:bg-primary/80 text-white rounded-full p-2.5 h-11 w-11 flex items-center justify-center shadow-glow-pro"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

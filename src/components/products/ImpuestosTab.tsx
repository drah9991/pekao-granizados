import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertCircle } from "lucide-react";

interface ImpuestosTabProps {
  selectedTax: string;
  setSelectedTax: (v: string) => void;
}

/**
 * Tab "Impuestos" de ProductFormDialog.tsx, extraída sin cambios de
 * comportamiento.
 */
export function ImpuestosTab({ selectedTax, setSelectedTax }: ImpuestosTabProps) {
  return (
    <div className="space-y-6 py-4 animate-fadeIn">
      <h3 className="text-sm font-black text-center text-slate-300 uppercase tracking-widest">Impuestos</h3>
      <div className="flex items-end justify-center gap-4 max-w-md mx-auto">
        <div className="flex-1 space-y-2">
          <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Impuesto</Label>
          <Select value={selectedTax} onValueChange={setSelectedTax}>
            <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-lg text-xs font-black uppercase text-white">
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent className="bg-slate-950 border-white/10">
              <SelectItem value="iva-19" className="text-xs font-black uppercase">IVA 19%</SelectItem>
              <SelectItem value="iva-8" className="text-xs font-black uppercase">IVA 8% (Consumo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          className="bg-primary hover:bg-primary/80 text-white rounded-full p-2.5 h-11 w-11 flex items-center justify-center shadow-glow-pro"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="text-center py-8 text-slate-500 font-black flex flex-col items-center justify-center gap-2 uppercase tracking-widest text-[10px]">
        <AlertCircle className="w-8 h-8 text-white/10" />
        No tiene impuestos relacionados.
      </div>
    </div>
  );
}
